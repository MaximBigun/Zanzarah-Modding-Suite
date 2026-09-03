param(
    [Parameter(Mandatory=$false)][string]$Exe = "D:\Steam\steamapps\common\ZanZarah\system\zanthp.exe",
    [Parameter(Mandatory=$false)][string]$GameRoot = "",
    [Parameter(Mandatory=$false)][string]$RussianFbsDir = ""
)

$ErrorActionPreference = 'Stop'
$Exe = (Resolve-Path $Exe).Path
if ([string]::IsNullOrWhiteSpace($GameRoot)) {
    $GameRoot = Split-Path (Split-Path $Exe -Parent) -Parent
}
$GameRoot = (Resolve-Path $GameRoot).Path
$DataDir = Join-Path $GameRoot 'Data'
$LocDir = Join-Path $GameRoot 'Localization'
$EnDir = Join-Path $LocDir 'en'
$RuDir = Join-Path $LocDir 'ru'
$StateFile = Join-Path $LocDir 'active_language.txt'

New-Item -ItemType Directory -Force -Path $LocDir,$EnDir,$RuDir | Out-Null

$fbsNames = 0..6 | ForEach-Object { '_fb0x{0:D2}.fbs' -f $_ }

function Copy-FbsSet([string]$SourceDir, [string]$DestinationDir) {
    foreach ($name in $fbsNames) {
        $src = Join-Path $SourceDir $name
        if (!(Test-Path $src)) { throw "Missing localization file: $src" }
        Copy-Item -Force $src (Join-Path $DestinationDir $name)
    }
}

# First run: preserve the currently installed Steam/English FBS set.
$enReady = $true
foreach ($name in $fbsNames) { if (!(Test-Path (Join-Path $EnDir $name))) { $enReady = $false; break } }
if (!$enReady) {
    Write-Host 'Creating Localization\en from current Data FBS files...'
    Copy-FbsSet $DataDir $EnDir
}

# Optional one-command import of an already extracted Russian FBS directory.
if (![string]::IsNullOrWhiteSpace($RussianFbsDir)) {
    $RussianFbsDir = (Resolve-Path $RussianFbsDir).Path
    Write-Host "Importing Russian FBS from: $RussianFbsDir"
    Copy-FbsSet $RussianFbsDir $RuDir
}

function Test-FbsSet([string]$Dir) {
    foreach ($name in $fbsNames) { if (!(Test-Path (Join-Path $Dir $name))) { return $false } }
    return $true
}

function Apply-Language([string]$Lang) {
    switch ($Lang) {
        'ru' {
            if (!(Test-FbsSet $RuDir)) { throw "Russian pack is incomplete: $RuDir" }
            Copy-FbsSet $RuDir $DataDir
        }
        default {
            Copy-FbsSet $EnDir $DataDir
            $Lang = 'en'
        }
    }
    Set-Content -Encoding ASCII -NoNewline -Path $StateFile -Value $Lang
    Write-Host "Active language applied: $Lang"
}

$active = 'en'
if (Test-Path $StateFile) {
    $v = (Get-Content $StateFile -Raw).Trim().ToLowerInvariant()
    if ($v -eq 'ru' -or $v -eq 'en') { $active = $v }
}
if ($active -eq 'ru' -and !(Test-FbsSet $RuDir)) { $active = 'en' }
Apply-Language $active

$src = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class ZmsComboBridge {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc cb, IntPtr p);
    [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr hWnd, EnumWindowsProc cb, IntPtr p);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] static extern int GetDlgCtrlID(IntPtr hWnd);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, string lParam);
    [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    const uint CB_ADDSTRING=0x0143, CB_RESETCONTENT=0x014B, CB_SETCURSEL=0x014E, CB_GETCURSEL=0x0147;

    public static IntPtr FindControl(int processId, int controlId) {
        IntPtr result=IntPtr.Zero;
        EnumWindows((top,p)=> {
            uint pid; GetWindowThreadProcessId(top,out pid);
            if(pid != (uint)processId) return true;
            if(GetDlgCtrlID(top)==controlId) { result=top; return false; }
            EnumChildWindows(top,(child,q)=> {
                uint cpid; GetWindowThreadProcessId(child,out cpid);
                if(cpid==(uint)processId && GetDlgCtrlID(child)==controlId) { result=child; return false; }
                return true;
            },IntPtr.Zero);
            return result==IntPtr.Zero;
        },IntPtr.Zero);
        return result;
    }
    public static void Fill(IntPtr combo, int selected) {
        SendMessage(combo,CB_RESETCONTENT,IntPtr.Zero,IntPtr.Zero);
        SendMessage(combo,CB_ADDSTRING,IntPtr.Zero,"English");
        SendMessage(combo,CB_ADDSTRING,IntPtr.Zero,"Russian");
        SendMessage(combo,CB_SETCURSEL,(IntPtr)selected,IntPtr.Zero);
    }
    public static int Selection(IntPtr combo) { return SendMessage(combo,CB_GETCURSEL,IntPtr.Zero,IntPtr.Zero).ToInt32(); }
}
'@
Add-Type -TypeDefinition $src -Language CSharp

Write-Host "Starting: $Exe"
$p = Start-Process -FilePath $Exe -WorkingDirectory (Split-Path $Exe -Parent) -PassThru
$combo = [IntPtr]::Zero
$deadline = (Get-Date).AddSeconds(30)
while (!$p.HasExited -and $combo -eq [IntPtr]::Zero -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 100
    $p.Refresh()
    $combo = [ZmsComboBridge]::FindControl($p.Id,1711)
}
if ($combo -eq [IntPtr]::Zero) {
    Write-Warning 'Language ComboBox (ID 1711) was not found. Is EXP2 installed?'
    exit 2
}

$selected = if ($active -eq 'ru') { 1 } else { 0 }
[ZmsComboBridge]::Fill($combo,$selected)
Write-Host 'Language ComboBox connected: English / Russian'
Write-Host 'For EXP3 the FBS set is switched immediately when the selection changes.'

$last = $selected
while (!$p.HasExited) {
    Start-Sleep -Milliseconds 80
    $p.Refresh()
    $currentCombo = [ZmsComboBridge]::FindControl($p.Id,1711)
    if ($currentCombo -eq [IntPtr]::Zero) { break }
    $cur = [ZmsComboBridge]::Selection($currentCombo)
    if ($cur -ne $last -and ($cur -eq 0 -or $cur -eq 1)) {
        if ($cur -eq 1) {
            if (Test-FbsSet $RuDir) {
                Apply-Language 'ru'
                $last=1
            } else {
                Write-Warning "Russian pack is not installed in $RuDir"
                [ZmsComboBridge]::Fill($currentCombo,0)
                Apply-Language 'en'
                $last=0
            }
        } else {
            Apply-Language 'en'
            $last=0
        }
    }
}

Write-Host 'Startup dialog closed; EXP3 bridge finished.'
