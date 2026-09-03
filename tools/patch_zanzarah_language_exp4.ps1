param(
    [Parameter(Mandatory=$false)][string]$Exe = "D:\Steam\steamapps\common\ZanZarah\System\zanzarah.exe",
    [switch]$Restore
)

$ErrorActionPreference = 'Stop'
$Exe = (Resolve-Path $Exe).Path
$SystemDir = Split-Path $Exe -Parent
$GameRoot = Split-Path $SystemDir -Parent
$Backup = "$Exe.zms_lang_exp4_backup"
$DllPath = Join-Path $SystemDir 'zms_language_exp4.dll'
$PayloadUrl = 'https://raw.githubusercontent.com/MaximBigun/Zanzarah-Modding-Suite/main/tools/zms_language_exp4.dll.b64'

function U16([byte[]]$b,[int]$o){ [BitConverter]::ToUInt16($b,$o) }
function U32([byte[]]$b,[int]$o){ [BitConverter]::ToUInt32($b,$o) }
function W16([byte[]]$b,[int]$o,[uint16]$v){ [BitConverter]::GetBytes($v).CopyTo($b,$o) }
function W32([byte[]]$b,[int]$o,[uint32]$v){ [BitConverter]::GetBytes($v).CopyTo($b,$o) }
function Align([uint32]$v,[uint32]$a){ [uint32](($v + $a - 1) -band -bnot($a - 1)) }
function ReadAsciiZ([byte[]]$b,[int]$o){
    $e=$o; while($e -lt $b.Length -and $b[$e] -ne 0){$e++}
    [Text.Encoding]::ASCII.GetString($b,$o,$e-$o)
}

if($Restore){
    if(!(Test-Path $Backup)){ throw "Backup not found: $Backup" }
    Copy-Item -Force $Backup $Exe
    if(Test-Path $DllPath){ Remove-Item -Force $DllPath }
    Write-Host 'EXP4 restored to original launcher.'
    exit 0
}

if(!(Test-Path $Backup)){
    Copy-Item $Exe $Backup
    Write-Host "Backup created: $Backup"
}

Write-Host 'Downloading native EXP4 payload...'
$tmp = [IO.Path]::GetTempFileName()
try {
    Invoke-WebRequest -UseBasicParsing -Uri $PayloadUrl -OutFile $tmp
    $b64 = (Get-Content $tmp -Raw).Trim()
    if([string]::IsNullOrWhiteSpace($b64)){ throw 'EXP4 DLL payload is empty. GitHub Actions build may still be running.' }
    [IO.File]::WriteAllBytes($DllPath,[Convert]::FromBase64String($b64))
} finally { Remove-Item -Force -ErrorAction SilentlyContinue $tmp }
Write-Host "Native runtime installed: $DllPath"

[byte[]]$b=[IO.File]::ReadAllBytes($Exe)
if($b.Length -lt 1024 -or $b[0] -ne 0x4D -or $b[1] -ne 0x5A){ throw 'Not a valid PE executable.' }
$pe=[int](U32 $b 0x3C)
if([Text.Encoding]::ASCII.GetString($b,$pe,4) -ne "PE`0`0"){ throw 'Invalid PE signature.' }
$coff=$pe+4
$num=[int](U16 $b ($coff+2))
$optSize=[int](U16 $b ($coff+16))
$opt=$coff+20
if((U16 $b $opt) -ne 0x10B){ throw 'EXP4 patcher supports PE32 (x86) only.' }
$imageBase=U32 $b ($opt+28)
$sectionAlign=U32 $b ($opt+32)
$fileAlign=U32 $b ($opt+36)
$oldOep=U32 $b ($opt+16)
$sizeImageOff=$opt+56
$sizeHeaders=U32 $b ($opt+60)
$importRva=U32 $b ($opt+104)
$sectionTable=$opt+$optSize

$sections=@()
for($i=0;$i -lt $num;$i++){
    $o=$sectionTable+$i*40
    $name=([Text.Encoding]::ASCII.GetString($b,$o,8)).Trim([char]0)
    $vs=U32 $b ($o+8); $va=U32 $b ($o+12); $rs=U32 $b ($o+16); $rp=U32 $b ($o+20)
    $sections += [pscustomobject]@{Offset=$o;Name=$name;VS=$vs;VA=$va;RS=$rs;RP=$rp}
}

function RvaToOff([uint32]$rva){
    foreach($s in $sections){
        $span=[Math]::Max([uint32]$s.VS,[uint32]$s.RS)
        if($rva -ge $s.VA -and $rva -lt ($s.VA+$span)){ return [int]($s.RP + ($rva-$s.VA)) }
    }
    if($rva -lt $sizeHeaders){ return [int]$rva }
    throw ('RVA 0x{0:X8} is not mapped' -f $rva)
}

$loadLibraryIatRva=$null
$impOff=RvaToOff $importRva
for($d=$impOff;;$d+=20){
    $orig=U32 $b $d; $nameRva=U32 $b ($d+12); $first=U32 $b ($d+16)
    if($orig -eq 0 -and $nameRva -eq 0 -and $first -eq 0){ break }
    $thunkRva=if($orig -ne 0){$orig}else{$first}
    $to=RvaToOff $thunkRva
    $idx=0
    while($true){
        $v=U32 $b ($to+$idx*4)
        if($v -eq 0){ break }
        if(($v -band 0x80000000) -eq 0){
            $hn=RvaToOff $v
            $fn=ReadAsciiZ $b ($hn+2)
            if($fn -eq 'LoadLibraryA'){
                $loadLibraryIatRva=[uint32]($first+$idx*4)
                break
            }
        }
        $idx++
    }
    if($loadLibraryIatRva -ne $null){ break }
}
if($loadLibraryIatRva -eq $null){ throw 'LoadLibraryA was not found in launcher import table; native bootstrap cannot be installed safely.' }

# Do not double-patch.
foreach($s in $sections){ if($s.Name -eq '.zms4'){ throw 'EXP4 section already exists. Use -Restore first if needed.' } }

$firstRaw=($sections | Where-Object {$_.RP -gt 0} | Sort-Object RP | Select-Object -First 1).RP
$newHeader=$sectionTable+$num*40
if(($newHeader+40) -gt $firstRaw){ throw 'No free PE section-header slot available.' }

$last=$sections | Sort-Object VA | Select-Object -Last 1
$newVa=Align ([uint32]($last.VA + [Math]::Max([uint32]$last.VS,[uint32]$last.RS))) $sectionAlign
$newRaw=Align ([uint32]$b.Length) $fileAlign
$dllName=[Text.Encoding]::ASCII.GetBytes("zms_language_exp4.dll`0")

# Bootstrap: preserve flags/registers, LoadLibraryA("zms_language_exp4.dll"), jump original OEP.
$code = New-Object System.Collections.Generic.List[byte]
$code.Add(0x9C); $code.Add(0x60) # pushfd / pushad
$stringRva=[uint32]($newVa + 32)
$stringVa=[uint32]($imageBase + $stringRva)
$code.Add(0x68); foreach($x in [BitConverter]::GetBytes($stringVa)){$code.Add($x)}
$code.Add(0xFF); $code.Add(0x15)
$iatVa=[uint32]($imageBase + $loadLibraryIatRva)
foreach($x in [BitConverter]::GetBytes($iatVa)){$code.Add($x)}
$code.Add(0x61); $code.Add(0x9D) # popad / popfd
$jmpPos=$code.Count
$code.Add(0xE9); 1..4 | ForEach-Object {$code.Add(0)}
while($code.Count -lt 32){$code.Add(0x90)}
foreach($x in $dllName){$code.Add($x)}
$payload=$code.ToArray()
$newRawSize=Align ([uint32]$payload.Length) $fileAlign
$newVs=[uint32]$payload.Length

# Fix rel32 jump after layout is known.
$jmpInstrRva=[uint32]($newVa + $jmpPos)
$nextRva=[uint32]($jmpInstrRva + 5)
$rel=[int32]([int64]$oldOep - [int64]$nextRva)
[BitConverter]::GetBytes($rel).CopyTo($payload,$jmpPos+1)

$newLen=[int]($newRaw+$newRawSize)
if($newLen -lt $b.Length){ throw 'Internal layout error.' }
$nb=New-Object byte[] $newLen
[Array]::Copy($b,$nb,$b.Length)
[Array]::Copy($payload,0,$nb,[int]$newRaw,$payload.Length)

# New section header.
$nameBytes=[Text.Encoding]::ASCII.GetBytes('.zms4')
[Array]::Copy($nameBytes,0,$nb,$newHeader,$nameBytes.Length)
W32 $nb ($newHeader+8) $newVs
W32 $nb ($newHeader+12) $newVa
W32 $nb ($newHeader+16) $newRawSize
W32 $nb ($newHeader+20) $newRaw
W32 $nb ($newHeader+36) 0x60000020 # code | execute | read

W16 $nb ($coff+2) ([uint16]($num+1))
W32 $nb ($opt+16) $newVa
W32 $nb $sizeImageOff (Align ([uint32]($newVa+$newVs)) $sectionAlign)

[IO.File]::WriteAllBytes($Exe,$nb)
Write-Host ('EXP4 patched successfully. Original OEP=0x{0:X8}, new OEP=0x{1:X8}' -f $oldOep,$newVa)
Write-Host 'Now launch System\zanzarah.exe normally. No PowerShell bridge is needed at runtime.'
Write-Host 'Language selection is stored in Localization\zms_language.ini.'
