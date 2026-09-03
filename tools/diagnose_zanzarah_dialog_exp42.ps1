param(
  [string]$exe="d:\steam\steamapps\common\zanzarah\system\zanzarah.exe"
)
$ErrorActionPreference='Stop'
$exe=(Resolve-Path $exe).Path
[byte[]]$b=[IO.File]::ReadAllBytes($exe)
function u16([byte[]]$x,[int]$o){[BitConverter]::ToUInt16($x,$o)}
function u32([byte[]]$x,[int]$o){[BitConverter]::ToUInt32($x,$o)}
function az([byte[]]$x,[int]$o){$e=$o;while($e-lt$x.Length-and$x[$e]-ne0){$e++};[Text.Encoding]::ASCII.GetString($x,$o,$e-$o)}
$pe=[int](u32 $b 0x3c)
if([Text.Encoding]::ASCII.GetString($b,$pe,4)-ne"PE`0`0"){throw 'invalid pe'}
$coff=$pe+4;$n=[int](u16 $b ($coff+2));$os=[int](u16 $b ($coff+16));$opt=$coff+20
if((u16 $b $opt)-ne0x10b){throw 'pe32 x86 expected'}
$hdr=u32 $b ($opt+60);$imp=u32 $b ($opt+104);$st=$opt+$os
$secs=@()
for($i=0;$i-lt$n;$i++){
  $o=$st+$i*40;$nm=([Text.Encoding]::ASCII.GetString($b,$o,8)).Trim([char]0)
  $secs+=[pscustomobject]@{n=$nm;vs=(u32 $b ($o+8));va=(u32 $b ($o+12));rs=(u32 $b ($o+16));rp=(u32 $b ($o+20))}
}
function r2o([uint32]$r){foreach($s in $secs){$sp=[Math]::Max([uint32]$s.vs,[uint32]$s.rs);if($r-ge$s.va-and$r-lt($s.va+$sp)){return [int]($s.rp+$r-$s.va)}};if($r-lt$hdr){return [int]$r};throw ('unmapped rva 0x{0:x8}'-f$r)}
$rows=@();$io=r2o $imp
for($d=$io;;$d+=20){
  $orig=u32 $b $d;$nr=u32 $b ($d+12);$first=u32 $b ($d+16)
  if($orig-eq0-and$nr-eq0-and$first-eq0){break}
  $dll=az $b (r2o $nr);$tr=if($orig-ne0){$orig}else{$first};$to=r2o $tr
  for($j=0;;$j++){
    $v=u32 $b ($to+$j*4);if($v-eq0){break}
    if(($v-band0x80000000)-ne0){$fn=('#ordinal_{0}'-f($v-band0xffff))}else{$hn=r2o $v;$fn=az $b ($hn+2)}
    $rows+=[pscustomobject]@{dll=$dll;function=$fn;iat_rva=('0x{0:x8}'-f([uint32]($first+$j*4)))}
  }
}
Write-Host ('exe: '+$exe)
Write-Host ('imports total: '+$rows.Count)
$rx='dialog|property|sheet|window|message|tab|control|resource|proc|class|create|loadlibrary|getprocaddress'
$interesting=$rows|Where-Object{$_.function-match$rx-or$_.dll-match'comctl|user32'}|Sort-Object dll,function
Write-Host '--- interesting imports ---'
$interesting|Format-Table -AutoSize|Out-String -Width 240|Write-Host
Write-Host '--- all imported dlls ---'
($rows.dll|Sort-Object -Unique)|ForEach-Object{Write-Host $_}
Write-Host '--- exact dialog/property candidates ---'
$candidates=$rows|Where-Object{$_.function-match'(?i)dialog|propertysheet|createpropertysheetpage|createwindow|sendmessage|setwindowlong|getwindowlong|defdlgproc|callwindowproc'}|Sort-Object function
if($candidates){$candidates|Format-Table -AutoSize|Out-String -Width 240|Write-Host}else{Write-Host '(none)'}
