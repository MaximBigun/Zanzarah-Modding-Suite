param(
  [string]$exe="d:\steam\steamapps\common\zanzarah\system\zanthp.exe",
  [string]$payloadzip="",
  [switch]$restore
)
$erroractionpreference='stop'
$exe=(resolve-path $exe).path
$sys=split-path $exe -parent
$bak="$exe.zms_lang_exp43_backup"
$dll=join-path $sys 'zms_language_exp41.dll'

function u16([byte[]]$b,[int]$o){ [bitconverter]::touint16($b,$o) }
function u32([byte[]]$b,[int]$o){ [bitconverter]::touint32($b,$o) }
function az([byte[]]$b,[int]$o){ $e=$o; while($e -lt $b.length -and $b[$e] -ne 0){$e++}; [text.encoding]::ascii.getstring($b,$o,$e-$o) }

if($restore){
  if(!(test-path $bak)){ throw "backup not found: $bak" }
  copy-item -force $bak $exe
  if(test-path $dll){ remove-item -force $dll }
  write-host 'exp4.3 restored.'
  exit
}

if(!(test-path $dll)){
  if([string]::isnullorwhitespace($payloadzip)){
    $candidate=join-path $psscriptroot 'zms-language-exp41.zip'
    if(test-path $candidate){$payloadzip=$candidate}
  }
  if([string]::isnullorwhitespace($payloadzip)){ throw 'pass -payloadzip <zms-language-exp41.zip> or place zms_language_exp41.dll in system.' }
  $payloadzip=(resolve-path $payloadzip).path
  $tmp=join-path $env:temp ('zms-exp43-'+[guid]::newguid().tostring('n'))
  new-item -itemtype directory $tmp|out-null
  try{
    expand-archive -force $payloadzip $tmp
    $src=get-childitem $tmp -recurse -filter zms_language_exp41.dll|select-object -first 1
    if(!$src){ throw 'zms_language_exp41.dll not found inside payload zip.' }
    copy-item -force $src.fullname $dll
  } finally { remove-item -force -recurse -erroraction silentlycontinue $tmp }
}
write-host "native runtime: $dll"

if(!(test-path $bak)){ copy-item $exe $bak; write-host "backup: $bak" }
[byte[]]$b=[io.file]::readallbytes($exe)
$pe=[int](u32 $b 0x3c)
if([text.encoding]::ascii.getstring($b,$pe,4) -ne "PE`0`0"){ throw 'invalid pe' }
$coff=$pe+4; $n=[int](u16 $b ($coff+2)); $os=[int](u16 $b ($coff+16)); $opt=$coff+20
if((u16 $b $opt) -ne 0x10b){ throw 'exp4.3 requires pe32 x86.' }
$ib=u32 $b ($opt+28); $hdr=u32 $b ($opt+60); $imp=u32 $b ($opt+104); $st=$opt+$os
$secs=@()
for($i=0;$i -lt $n;$i++){
  $o=$st+$i*40; $nm=([text.encoding]::ascii.getstring($b,$o,8)).trim([char]0)
  $secs += [pscustomobject]@{o=$o;n=$nm;vs=(u32 $b ($o+8));va=(u32 $b ($o+12));rs=(u32 $b ($o+16));rp=(u32 $b ($o+20));ch=(u32 $b ($o+36))}
}
function r2o([uint32]$r){
  foreach($s in $secs){
    $sp=[math]::max([uint32]$s.vs,[uint32]$s.rs)
    if($r -ge $s.va -and $r -lt ($s.va+$sp)){ return [int]($s.rp+$r-$s.va) }
  }
  if($r -lt $hdr){ return [int]$r }
  throw ('unmapped rva 0x{0:x8}' -f $r)
}

$imports=@{}
$io=r2o $imp
for($d=$io;;$d+=20){
  $orig=u32 $b $d; $nr=u32 $b ($d+12); $first=u32 $b ($d+16)
  if($orig -eq 0 -and $nr -eq 0 -and $first -eq 0){ break }
  $tr=if($orig -ne 0){$orig}else{$first}; $to=r2o $tr
  for($j=0;;$j++){
    $v=u32 $b ($to+$j*4); if($v -eq 0){break}
    if(($v -band 0x80000000) -eq 0){
      $hn=r2o $v; $fn=az $b ($hn+2); $imports[$fn]=[uint32]($first+$j*4)
    }
  }
}
foreach($need in @('LoadLibraryA','GetProcAddress','DialogBoxParamA','CreateDialogParamA')){
  if(!$imports.containskey($need)){ throw "$need import not found." }
}

$calls=@{}
foreach($fn in @('DialogBoxParamA','CreateDialogParamA')){
  $iatva=[uint32]($ib+$imports[$fn]); $pat=[byte[]](0xff,0x15)+[bitconverter]::getbytes($iatva); $found=@()
  foreach($s in $secs | where-object { ($_.ch -band 0x20000000) -ne 0 }){
    for($p=[int]$s.rp;$p -le [int]($s.rp+$s.rs-6);$p++){
      $ok=$true; for($k=0;$k -lt 6;$k++){ if($b[$p+$k] -ne $pat[$k]){$ok=$false;break} }
      if($ok){ $found += [pscustomobject]@{off=$p;rva=[uint32]($s.va+$p-$s.rp);sec=$s.n} }
    }
  }
  $calls[$fn]=$found
  write-host ("{0}: {1} call site(s)" -f $fn,$found.count)
}
$total=(($calls.values | foreach-object {$_.count}) | measure-object -sum).sum
if($total -eq 0){ throw 'no direct call [iat] sites found for dialog apis.' }

$needbytes=320
$cavesec=$null; $caveoff=0; $caverva=0
foreach($s in $secs | where-object { ($_.ch -band 0x20000000) -ne 0 }){
  if($s.rs -gt $s.vs -and ($s.rs-$s.vs) -ge $needbytes){
    $start=[int]($s.rp+$s.vs); $allpad=$true
    for($q=$start;$q -lt $start+$needbytes;$q++){ if($b[$q] -ne 0 -and $b[$q] -ne 0xcc){$allpad=$false;break} }
    if($allpad){ $cavesec=$s; $caveoff=$start; $caverva=[uint32]($s.va+$s.vs); break }
  }
}
if($null -eq $cavesec){ throw 'no safe executable raw-padding cave >=320 bytes. nothing was patched.' }
write-host ('safe cave: {0} file+0x{1:x}, rva 0x{2:x8}' -f $cavesec.n,$caveoff,$caverva)

$buf=new-object collections.generic.list[byte]
function addbytes([byte[]]$x){ foreach($v in $x){$script:buf.add($v)} }
function addz([string]$s){ addbytes ([text.encoding]::ascii.getbytes($s+[char]0)) }
$bridgeinfo=@{}
foreach($fn in @('DialogBoxParamA','CreateDialogParamA')){
  $bridgestart=$buf.count
  $buf.add(0x68); $dllimm=$buf.count; addbytes ([byte[]](0,0,0,0))
  addbytes ([byte[]](0xff,0x15)); addbytes ([bitconverter]::getbytes([uint32]($ib+$imports['LoadLibraryA'])))
  addbytes ([byte[]](0x85,0xc0,0x74,0x12))
  $buf.add(0x68); $procimm=$buf.count; addbytes ([byte[]](0,0,0,0)); $buf.add(0x50)
  addbytes ([byte[]](0xff,0x15)); addbytes ([bitconverter]::getbytes([uint32]($ib+$imports['GetProcAddress'])))
  addbytes ([byte[]](0x85,0xc0,0x74,0x02,0xff,0xe0))
  addbytes ([byte[]](0xff,0x25)); addbytes ([bitconverter]::getbytes([uint32]($ib+$imports[$fn])))
  $bridgeinfo[$fn]=[pscustomobject]@{start=$bridgestart;dllimm=$dllimm;procimm=$procimm}
}
$dllstroff=$buf.count; addz 'zms_language_exp41.dll'
$procstr=@{}
$procstr['DialogBoxParamA']=$buf.count; addz 'ZmsDialogBoxParamA'
$procstr['CreateDialogParamA']=$buf.count; addz 'ZmsCreateDialogParamA'
if($buf.count -gt $needbytes){ throw 'internal exp4.3 cave size overflow.' }
$payload=$buf.toarray()
$dllva=[uint32]($ib+$caverva+$dllstroff)
foreach($fn in @('DialogBoxParamA','CreateDialogParamA')){
  [bitconverter]::getbytes($dllva).copyto($payload,$bridgeinfo[$fn].dllimm)
  $pva=[uint32]($ib+$caverva+$procstr[$fn]); [bitconverter]::getbytes($pva).copyto($payload,$bridgeinfo[$fn].procimm)
}
[array]::copy($payload,0,$b,$caveoff,$payload.length)

$patched=0
foreach($fn in @('DialogBoxParamA','CreateDialogParamA')){
  $bridgerva=[uint32]($caverva+$bridgeinfo[$fn].start)
  foreach($site in $calls[$fn]){
    $rel=[int32]([int64]$bridgerva-[int64]($site.rva+5))
    $b[$site.off]=0xe8; [bitconverter]::getbytes($rel).copyto($b,$site.off+1); $b[$site.off+5]=0x90
    $patched++
    write-host ('patched {0} call at rva 0x{1:x8}' -f $fn,$site.rva)
  }
}
[io.file]::writeallbytes($exe,$b)
write-host "exp4.3 ok. patched call sites: $patched"
write-host 'oep and pe section layout were not changed.'
write-host 'launch system\zanzarah.exe normally.'
