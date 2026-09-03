param(
    [Parameter(Mandatory=$false)][string]$Exe = "D:\Steam\steamapps\common\ZanZarah\system\zanthp.exe",
    [Parameter(Mandatory=$false)][string]$GameRoot = "",
    [Parameter(Mandatory=$false)][string]$RussianFbsDir = ""
)

$ErrorActionPreference = 'Stop'
$Exe = (Resolve-Path $Exe).Path
if ([string]::IsNullOrWhiteSpace($GameRoot)) { $GameRoot = Split-Path (Split-Path $Exe -Parent) -Parent }
$GameRoot = (Resolve-Path $GameRoot).Path
$DataDir = Join-Path $GameRoot 'Data'
$LocDir = Join-Path $GameRoot 'Localization'
$EnDir = Join-Path $LocDir 'en'
$RuDir = Join-Path $LocDir 'ru'
$StateFile = Join-Path $LocDir 'active_language.txt'
New-Item -ItemType Directory -Force -Path $LocDir,$EnDir,$RuDir | Out-Null
$fbsNames = 0..6 | ForEach-Object { '_fb0x{0:D2}.fbs' -f $_ }

function Copy-FbsSet([string]$SourceDir,[string]$DestinationDir) {
    foreach($name in $fbsNames) {
        $src=Join-Path $SourceDir $name
        if(!(Test-Path $src)){ throw "Missing localization file: $src" }
        Copy-Item -Force $src (Join-Path $DestinationDir $name)
    }
}
function Test-FbsSet([string]$Dir) {
    foreach($name in $fbsNames){ if(!(Test-Path (Join-Path $Dir $name))){ return $false } }
    return $true
}

if(!(Test-FbsSet $EnDir)) {
    Write-Host 'Creating Localization\en from current Data FBS files...'
    Copy-FbsSet $DataDir $EnDir
}
if(![string]::IsNullOrWhiteSpace($RussianFbsDir)) {
    $RussianFbsDir=(Resolve-Path $RussianFbsDir).Path
    Write-Host "Importing Russian FBS from: $RussianFbsDir"
    Copy-FbsSet $RussianFbsDir $RuDir
}

function Apply-Language([string]$Lang) {
    if($Lang -eq 'ru') {
        if(!(Test-FbsSet $RuDir)){ throw "Russian pack is incomplete: $RuDir" }
        Copy-FbsSet $RuDir $DataDir
    } else {
        $Lang='en'; Copy-FbsSet $EnDir $DataDir
    }
    Set-Content -Encoding ASCII -NoNewline -Path $StateFile -Value $Lang
    Write-Host "Active language applied: $Lang"
}

$active='en'
if(Test-Path $StateFile){ $v=(Get-Content $StateFile -Raw).Trim().ToLowerInvariant(); if($v -in @('en','ru')){$active=$v} }
if($active -eq 'ru' -and !(Test-FbsSet $RuDir)){ $active='en' }
Apply-Language $active

# V2 class name is intentional: PowerShell cannot redefine an Add-Type class in the same session.
$src=@'
using System;
using System.Runtime.InteropServices;
public static class ZmsComboBridgeExp3V2 {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc cb, IntPtr p);
    [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr hWnd, EnumWindowsProc cb, IntPtr p);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd,out uint pid);
    [DllImport("user32.dll")] static extern int GetDlgCtrlID(IntPtr hWnd);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr SendMessage(IntPtr hWnd,uint msg,IntPtr wParam,string lParam);
    [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr hWnd,uint msg,IntPtr wParam,IntPtr lParam);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr hWnd);
    const uint CB_ADDSTRING=0x0143,CB_RESETCONTENT=0x014B,CB_SETCURSEL=0x014E,CB_GETCURSEL=0x0147;
    public static IntPtr FindControl(int processId,int controlId){
        IntPtr result=IntPtr.Zero;
        EnumWindows((top,p)=>{
            uint pid; GetWindowThreadProcessId(top,out pid); if(pid!=(uint)processId)return true;
            if(GetDlgCtrlID(top)==controlId){result=top;return false;}
            EnumChildWindows(top,(child,q)=>{uint cpid;GetWindowThreadProcessId(child,out cpid);if(cpid==(uint)processId&&GetDlgCtrlID(child)==controlId){result=child;return false;}return true;},IntPtr.Zero);
            return result==IntPtr.Zero;
        },IntPtr.Zero); return result;
    }
    public static bool Valid(IntPtr h){return h!=IntPtr.Zero&&IsWindow(h);}
    public static void Fill(IntPtr combo,int selected){
        SendMessage(combo,CB_RESETCONTENT,IntPtr.Zero,IntPtr.Zero);
        SendMessage(combo,CB_ADDSTRING,IntPtr.Zero,"English");
        SendMessage(combo,CB_ADDSTRING,IntPtr.Zero,"Russian");
        SendMessage(combo,CB_SETCURSEL,(IntPtr)selected,IntPtr.Zero);
    }
    public static int Selection(IntPtr combo){return SendMessage(combo,CB_GETCURSEL,IntPtr.Zero,IntPtr.Zero).ToInt32();}
}
'@
if(-not ('ZmsComboBridgeExp3V2' -as [type])) { Add-Type -TypeDefinition $src -Language CSharp }

Write-Host "Starting: $Exe"
$p=Start-Process -FilePath $Exe -WorkingDirectory (Split-Path $Exe -Parent) -PassThru
$selected=if($active -eq 'ru'){1}else{0}; $last=$selected
$combo=[IntPtr]::Zero; $connectedOnce=$false; $hintShown=$false
while(!$p.HasExited) {
    Start-Sleep -Milliseconds 100; $p.Refresh()
    if(![ZmsComboBridgeExp3V2]::Valid($combo)) {
        $combo=[ZmsComboBridgeExp3V2]::FindControl($p.Id,1711)
        if($combo -eq [IntPtr]::Zero) {
            if(!$hintShown){ Write-Host 'Waiting for Language ComboBox... open the Settings tab in the Zanzarah startup menu.'; $hintShown=$true }
            continue
        }
        [ZmsComboBridgeExp3V2]::Fill($combo,$last)
        if(!$connectedOnce){ Write-Host 'Language ComboBox connected: English / Russian'; Write-Host 'EXP3 switches the FBS set immediately when the selection changes.'; $connectedOnce=$true }
        else { Write-Host 'Language ComboBox reconnected.' }
    }
    $cur=[ZmsComboBridgeExp3V2]::Selection($combo)
    if($cur -ne $last -and $cur -in @(0,1)) {
        if($cur -eq 1) {
            if(Test-FbsSet $RuDir){ Apply-Language 'ru'; $last=1 }
            else { Write-Warning "Russian pack is not installed in $RuDir"; [ZmsComboBridgeExp3V2]::Fill($combo,0); Apply-Language 'en'; $last=0 }
        } else { Apply-Language 'en'; $last=0 }
    }
}
if(!$connectedOnce){ Write-Warning 'The Settings tab was never opened, so the Language ComboBox was never created.' }
Write-Host 'Startup dialog closed; EXP3 bridge finished.'
