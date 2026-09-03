param(
  [string]$Exe="D:\Steam\steamapps\common\ZanZarah\System\zanzarah.exe",
  [string]$PayloadZip="",
  [switch]$Restore
)
$ErrorActionPreference='Stop'
$Exe=(Resolve-Path $Exe).Path
$sys=Split-Path $Exe -Parent
$bak="$Exe.zms_lang_exp4_backup"
$dll=Join-Path $sys 'zms_language_exp4.dll'

function U16($b,$o){[BitConverter]::ToUInt16($b,$o)}
function U32($b,$o){[BitConverter]::ToUInt32($b,$o)}
function W16($b,$o,$v){[BitConverter]::GetBytes([uint16]$v).CopyTo($b,$o)}
function W32($b,$o,$v){[BitConverter]::GetBytes([uint32]$v).CopyTo($b,$o)}
function AL([uint32]$v,[uint32]$a){[uint32](($v+$a-1)-band -bnot($a-1))}
function AZ($b,$o){$e=$o;while($e-lt$b.Length-and$b[$e]-ne 0){$e++};[Text.Encoding]::ASCII.GetString($b,$o,$e-$o)}

if($Restore){
  if(!(Test-Path $bak)){throw "Backup not found: $bak"}
  Copy-Item -Force $bak $Exe
  if(Test-Path $dll){Remove-Item -Force $dll}
  Write-Host 'EXP4 restored.'
  exit
}

if(!(Test-Path $dll)){
  if([string]::IsNullOrWhiteSpace($PayloadZip)){
    $candidate=Join-Path $PSScriptRoot 'zms-language-exp4.zip'
    if(Test-Path $candidate){$PayloadZip=$candidate}
  }
  if([string]::IsNullOrWhiteSpace($PayloadZip)){throw 'zms_language_exp4.dll not found. Put it in System or pass -PayloadZip <zms-language-exp4.zip>.'}
  $PayloadZip=(Resolve-Path $PayloadZip).Path
  $tmp=Join-Path $env:TEMP ('zms-exp4-'+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory $tmp|Out-Null
  try{
    Expand-Archive -Force $PayloadZip $tmp
    $src=Get-ChildItem $tmp -Recurse -Filter zms_language_exp4.dll|Select-Object -First 1
    if(!$src){throw 'zms_language_exp4.dll not found inside payload ZIP.'}
    Copy-Item -Force $src.FullName $dll
  }finally{Remove-Item -Force -Recurse -ErrorAction SilentlyContinue $tmp}
}
Write-Host "Native runtime: $dll"

if(!(Test-Path $bak)){Copy-Item $Exe $bak;Write-Host "Backup: $bak"}
[byte[]]$b=[IO.File]::ReadAllBytes($Exe)
$pe=[int](U32 $b 0x3c);if([Text.Encoding]::ASCII.GetString($b,$pe,4)-ne"PE`0`0"){throw 'Invalid PE'}
$coff=$pe+4;$n=[int](U16 $b ($coff+2));$os=[int](U16 $b ($coff+16));$opt=$coff+20
if((U16 $b $opt)-ne 0x10b){throw 'EXP4 requires PE32 x86 launcher.'}
$ib=U32 $b ($opt+28);$sa=U32 $b ($opt+32);$fa=U32 $b ($opt+36);$oep=U32 $b ($opt+16);$hdr=U32 $b ($opt+60);$imp=U32 $b ($opt+104);$st=$opt+$os
$secs=@();for($i=0;$i-lt$n;$i++){$o=$st+$i*40;$nm=([Text.Encoding]::ASCII.GetString($b,$o,8)).Trim([char]0);$secs+=[pscustomobject]@{O=$o;N=$nm;VS=U32 $b ($o+8);VA=U32 $b ($o+12);RS=U32 $b ($o+16);RP=U32 $b ($o+20)}}
foreach($s in $secs){if($s.N-eq'.zms4'){throw 'Already patched. Use -Restore first.'}}
function R2O([uint32]$r){foreach($s in $secs){$sp=[Math]::Max([uint32]$s.VS,[uint32]$s.RS);if($r-ge$s.VA-and$r-lt($s.VA+$sp)){return[int]($s.RP+$r-$s.VA)}};if($r-lt$hdr){return[int]$r};throw ('Unmapped RVA 0x{0:X8}'-f$r)}
$iat=$null;$io=R2O $imp
for($d=$io;;$d+=20){$orig=U32 $b $d;$nr=U32 $b ($d+12);$first=U32 $b ($d+16);if($orig-eq0-and$nr-eq0-and$first-eq0){break};$tr=if($orig){$orig}else{$first};$to=R2O $tr;for($j=0;;$j++){$v=U32 $b ($to+$j*4);if(!$v){break};if(($v-band0x80000000)-eq0){$hn=R2O $v;if((AZ $b ($hn+2))-eq'LoadLibraryA'){$iat=[uint32]($first+$j*4);break}}};if($null-ne$iat){break}}
if($null-eq$iat){throw 'LoadLibraryA import not found.'}
$firstRaw=($secs|?{$_.RP-gt0}|sort RP|select -First 1).RP;$nh=$st+$n*40;if($nh+40-gt$firstRaw){throw 'No free section-header slot.'}
$last=$secs|sort VA|select -Last 1;$nva=AL ([uint32]($last.VA+[Math]::Max([uint32]$last.VS,[uint32]$last.RS))) $sa;$nrp=AL ([uint32]$b.Length) $fa
$name=[Text.Encoding]::ASCII.GetBytes("zms_language_exp4.dll`0");$c=New-Object Collections.Generic.List[byte];$c.Add(0x9c);$c.Add(0x60);$sva=[uint32]($ib+$nva+32);$c.Add(0x68);[BitConverter]::GetBytes($sva)|%{$c.Add($_)};$c.Add(0xff);$c.Add(0x15);[BitConverter]::GetBytes([uint32]($ib+$iat))|%{$c.Add($_)};$c.Add(0x61);$c.Add(0x9d);$jp=$c.Count;$c.Add(0xe9);1..4|%{$c.Add(0)};while($c.Count-lt32){$c.Add(0x90)};$name|%{$c.Add($_)};$pay=$c.ToArray();$rel=[int32]([int64]$oep-[int64]($nva+$jp+5));[BitConverter]::GetBytes($rel).CopyTo($pay,$jp+1)
$rr=AL ([uint32]$pay.Length) $fa;$nb=New-Object byte[] ([int]($nrp+$rr));[Array]::Copy($b,$nb,$b.Length);[Array]::Copy($pay,0,$nb,[int]$nrp,$pay.Length)
[Array]::Copy([Text.Encoding]::ASCII.GetBytes('.zms4'),0,$nb,$nh,5);W32 $nb ($nh+8) $pay.Length;W32 $nb ($nh+12) $nva;W32 $nb ($nh+16) $rr;W32 $nb ($nh+20) $nrp;W32 $nb ($nh+36) 0x60000020;W16 $nb ($coff+2) ($n+1);W32 $nb ($opt+16) $nva;W32 $nb ($opt+56) (AL ([uint32]($nva+$pay.Length)) $sa)
[IO.File]::WriteAllBytes($Exe,$nb)
Write-Host ('EXP4 OK. OEP 0x{0:X8} -> 0x{1:X8}'-f$oep,$nva)
Write-Host 'Launch System\zanzarah.exe normally. No PowerShell bridge is needed at runtime.'
