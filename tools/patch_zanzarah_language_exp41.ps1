param(
  [string]$Exe="D:\Steam\steamapps\common\ZanZarah\System\zanzarah.exe",
  [string]$PayloadZip="",
  [switch]$Restore
)
$ErrorActionPreference='Stop'
$Exe=(Resolve-Path $Exe).Path
$sys=Split-Path $Exe -Parent
$bak="$Exe.zms_lang_exp41_backup"
$dll=Join-Path $sys 'zms_language_exp41.dll'

function U16([byte[]]$b,[int]$o){ [BitConverter]::ToUInt16($b,$o) }
function U32([byte[]]$b,[int]$o){ [BitConverter]::ToUInt32($b,$o) }
function W32([byte[]]$b,[int]$o,[uint32]$v){ [BitConverter]::GetBytes($v).CopyTo($b,$o) }
function AZ([byte[]]$b,[int]$o){ $e=$o; while($e -lt $b.Length -and $b[$e] -ne 0){$e++}; [Text.Encoding]::ASCII.GetString($b,$o,$e-$o) }
function Align([uint32]$v,[uint32]$a){ [uint32](($v+$a-1)-band -bnot($a-1)) }

if($Restore){
  if(!(Test-Path $bak)){ throw "Backup not found: $bak" }
  Copy-Item -Force $bak $Exe
  if(Test-Path $dll){ Remove-Item -Force $dll }
  Write-Host 'EXP4.1 restored.'
  exit
}

if(!(Test-Path $dll)){
  if([string]::IsNullOrWhiteSpace($PayloadZip)){
    $candidate=Join-Path $PSScriptRoot 'zms-language-exp41.zip'
    if(Test-Path $candidate){$PayloadZip=$candidate}
  }
  if([string]::IsNullOrWhiteSpace($PayloadZip)){ throw 'Pass -PayloadZip <zms-language-exp41.zip> or place zms_language_exp41.dll in System.' }
  $PayloadZip=(Resolve-Path $PayloadZip).Path
  $tmp=Join-Path $env:TEMP ('zms-exp41-'+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory $tmp|Out-Null
  try{
    Expand-Archive -Force $PayloadZip $tmp
    $src=Get-ChildItem $tmp -Recurse -Filter zms_language_exp41.dll|Select-Object -First 1
    if(!$src){ throw 'zms_language_exp41.dll not found inside payload ZIP.' }
    Copy-Item -Force $src.FullName $dll
  } finally { Remove-Item -Force -Recurse -ErrorAction SilentlyContinue $tmp }
}
Write-Host "Native runtime: $dll"

if(!(Test-Path $bak)){ Copy-Item $Exe $bak; Write-Host "Backup: $bak" }
[byte[]]$b=[IO.File]::ReadAllBytes($Exe)
$pe=[int](U32 $b 0x3c)
if([Text.Encoding]::ASCII.GetString($b,$pe,4) -ne "PE`0`0"){ throw 'Invalid PE' }
$coff=$pe+4; $n=[int](U16 $b ($coff+2)); $os=[int](U16 $b ($coff+16)); $opt=$coff+20
if((U16 $b $opt) -ne 0x10b){ throw 'EXP4.1 requires PE32 x86.' }
$ib=U32 $b ($opt+28); $sa=U32 $b ($opt+32); $hdr=U32 $b ($opt+60); $imp=U32 $b ($opt+104); $st=$opt+$os
$secs=@()
for($i=0;$i -lt $n;$i++){
  $o=$st+$i*40; $nm=([Text.Encoding]::ASCII.GetString($b,$o,8)).Trim([char]0)
  $secs += [pscustomobject]@{O=$o;N=$nm;VS=(U32 $b ($o+8));VA=(U32 $b ($o+12));RS=(U32 $b ($o+16));RP=(U32 $b ($o+20));CH=(U32 $b ($o+36))}
}
function R2O([uint32]$r){
  foreach($s in $secs){
    $sp=[Math]::Max([uint32]$s.VS,[uint32]$s.RS)
    if($r -ge $s.VA -and $r -lt ($s.VA+$sp)){ return [int]($s.RP+$r-$s.VA) }
  }
  if($r -lt $hdr){ return [int]$r }
  throw ('Unmapped RVA 0x{0:X8}' -f $r)
}

$imports=@{}
$io=R2O $imp
for($d=$io;;$d+=20){
  $orig=U32 $b $d; $nr=U32 $b ($d+12); $first=U32 $b ($d+16)
  if($orig -eq 0 -and $nr -eq 0 -and $first -eq 0){ break }
  $tr=if($orig -ne 0){$orig}else{$first}; $to=R2O $tr
  for($j=0;;$j++){
    $v=U32 $b ($to+$j*4); if($v -eq 0){break}
    if(($v -band 0x80000000) -eq 0){
      $hn=R2O $v; $fn=AZ $b ($hn+2); $imports[$fn]=[uint32]($first+$j*4)
    }
  }
}
foreach($need in @('LoadLibraryA','GetProcAddress')){ if(!$imports.ContainsKey($need)){ throw "$need import not found; EXP4.1 safe bridge cannot be installed." } }
$targets=@()
foreach($fn in @('DialogBoxParamA','CreateDialogParamA')){ if($imports.ContainsKey($fn)){ $targets += $fn } }
if($targets.Count -eq 0){ throw 'Neither DialogBoxParamA nor CreateDialogParamA is imported.' }
Write-Host ('Hook targets: '+($targets -join ', '))

# Find direct CALL [IAT] sites in executable sections before modifying anything.
$calls=@{}
foreach($fn in $targets){
  $iatVA=[uint32]($ib+$imports[$fn]); $pat=[byte[]](0xFF,0x15)+[BitConverter]::GetBytes($iatVA); $found=@()
  foreach($s in $secs | Where-Object { ($_.CH -band 0x20000000) -ne 0 }){
    for($p=[int]$s.RP;$p -le [int]($s.RP+$s.RS-6);$p++){
      $ok=$true; for($k=0;$k -lt 6;$k++){ if($b[$p+$k] -ne $pat[$k]){$ok=$false;break} }
      if($ok){ $found += [pscustomobject]@{Off=$p;Rva=[uint32]($s.VA+$p-$s.RP);Sec=$s.N} }
    }
  }
  $calls[$fn]=$found
  Write-Host ("{0}: {1} CALL site(s)" -f $fn,$found.Count)
}
if((($calls.Values | ForEach-Object {$_.Count}) | Measure-Object -Sum).Sum -eq 0){ throw 'No CALL [IAT] sites found for dialog APIs.' }

# Use only file-alignment padding at the end of an executable section; do not add a section and do not change OEP/header layout.
$needBytes=320
$caveSec=$null; $caveOff=0; $caveRva=0
foreach($s in $secs | Where-Object { ($_.CH -band 0x20000000) -ne 0 }){
  if($s.RS -gt $s.VS -and ($s.RS-$s.VS) -ge $needBytes){
    $start=[int]($s.RP+$s.VS); $allPad=$true
    for($q=$start;$q -lt $start+$needBytes;$q++){ if($b[$q] -ne 0 -and $b[$q] -ne 0xCC){$allPad=$false;break} }
    if($allPad){ $caveSec=$s; $caveOff=$start; $caveRva=[uint32]($s.VA+$s.VS); break }
  }
}
if($null -eq $caveSec){ throw 'No safe executable raw-padding cave >=320 bytes. Nothing was patched. Send this output and we will use a different in-place strategy.' }
Write-Host ('Safe cave: {0} file+0x{1:X}, RVA 0x{2:X8}' -f $caveSec.N,$caveOff,$caveRva)

$buf=New-Object Collections.Generic.List[byte]
$labels=@{}
function AddBytes([byte[]]$x){ foreach($v in $x){$script:buf.Add($v)} }
function AddZ([string]$s){ AddBytes ([Text.Encoding]::ASCII.GetBytes($s+[char]0)) }

# Reserve bridge code first; strings are appended later and absolute addresses fixed afterwards.
$bridgeInfo=@{}
foreach($fn in $targets){
  $bridgeStart=$buf.Count
  # push dllNameVA
  $buf.Add(0x68); $dllImm=$buf.Count; AddBytes ([byte[]](0,0,0,0))
  # call [LoadLibraryA IAT]
  AddBytes ([byte[]](0xFF,0x15)); AddBytes ([BitConverter]::GetBytes([uint32]($ib+$imports['LoadLibraryA'])))
  AddBytes ([byte[]](0x85,0xC0,0x74,0x12))
  # push procNameVA; push eax; call [GetProcAddress]
  $buf.Add(0x68); $procImm=$buf.Count; AddBytes ([byte[]](0,0,0,0)); $buf.Add(0x50)
  AddBytes ([byte[]](0xFF,0x15)); AddBytes ([BitConverter]::GetBytes([uint32]($ib+$imports['GetProcAddress'])))
  AddBytes ([byte[]](0x85,0xC0,0x74,0x02,0xFF,0xE0))
  # fallback: jmp [original API IAT]
  AddBytes ([byte[]](0xFF,0x25)); AddBytes ([BitConverter]::GetBytes([uint32]($ib+$imports[$fn])))
  $bridgeInfo[$fn]=[pscustomobject]@{Start=$bridgeStart;DllImm=$dllImm;ProcImm=$procImm}
}
$dllStrOff=$buf.Count; AddZ 'zms_language_exp41.dll'
$procStr=@{}
foreach($fn in $targets){ $procStr[$fn]=$buf.Count; AddZ (if($fn -eq 'DialogBoxParamA'){'ZmsDialogBoxParamA'}else{'ZmsCreateDialogParamA'}) }
if($buf.Count -gt $needBytes){ throw 'Internal EXP4.1 cave size overflow.' }

$payload=$buf.ToArray()
$dllVA=[uint32]($ib+$caveRva+$dllStrOff)
foreach($fn in $targets){
  [BitConverter]::GetBytes($dllVA).CopyTo($payload,$bridgeInfo[$fn].DllImm)
  $pva=[uint32]($ib+$caveRva+$procStr[$fn]); [BitConverter]::GetBytes($pva).CopyTo($payload,$bridgeInfo[$fn].ProcImm)
}
[Array]::Copy($payload,0,$b,$caveOff,$payload.Length)

$patched=0
foreach($fn in $targets){
  $bridgeRva=[uint32]($caveRva+$bridgeInfo[$fn].Start)
  foreach($site in $calls[$fn]){
    $rel=[int32]([int64]$bridgeRva-[int64]($site.Rva+5))
    $b[$site.Off]=0xE8; [BitConverter]::GetBytes($rel).CopyTo($b,$site.Off+1); $b[$site.Off+5]=0x90
    $patched++
    Write-Host ('Patched {0} call at RVA 0x{1:X8}' -f $fn,$site.Rva)
  }
}
[IO.File]::WriteAllBytes($Exe,$b)
Write-Host "EXP4.1 OK. Patched call sites: $patched"
Write-Host 'OEP, section count and PE layout were NOT changed.'
Write-Host 'Launch System\zanzarah.exe normally.'
