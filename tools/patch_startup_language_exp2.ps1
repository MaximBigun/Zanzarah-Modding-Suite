param(
    [Parameter(Mandatory=$false)][string]$Exe = ".\zanthp.exe",
    [switch]$Restore
)

$ErrorActionPreference = 'Stop'
$Exe = (Resolve-Path $Exe).Path
$OldBackup = $Exe + '.zms_lang_exp1_backup'
$Backup = $Exe + '.zms_lang_exp2_backup'

if ($Restore) {
    $srcBackup = if (Test-Path $OldBackup) { $OldBackup } elseif (Test-Path $Backup) { $Backup } else { $null }
    if (!$srcBackup) { throw "Backup not found." }
    Copy-Item -Force $srcBackup $Exe
    Write-Host "Restored original EXE from: $srcBackup"
    exit 0
}

# EXP1 created a clean pre-patch backup. Prefer it so rerunning EXP2 removes the old radio controls first.
if (Test-Path $OldBackup) {
    Copy-Item -Force $OldBackup $Exe
    Write-Host "Restored clean EXE from EXP1 backup before applying EXP2."
} elseif (!(Test-Path $Backup)) {
    Copy-Item $Exe $Backup
    Write-Host "Backup created: $Backup"
} else {
    Copy-Item -Force $Backup $Exe
    Write-Host "Restored clean EXE from EXP2 backup before repatching."
}

$src = @'
using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class ZmsLangExp2 {
    const uint LOAD_LIBRARY_AS_DATAFILE = 0x00000002;
    const uint DONT_RESOLVE_DLL_REFERENCES = 0x00000001;
    static readonly IntPtr RT_DIALOG = (IntPtr)5;

    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern IntPtr LoadLibraryEx(string lpFileName, IntPtr hFile, uint flags);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool FreeLibrary(IntPtr h);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern IntPtr FindResourceEx(IntPtr h, IntPtr type, IntPtr name, ushort lang);
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr LoadResource(IntPtr h, IntPtr res);
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr LockResource(IntPtr res);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint SizeofResource(IntPtr h, IntPtr res);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern IntPtr BeginUpdateResource(string pFileName, bool bDeleteExistingResources);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool UpdateResource(IntPtr hUpdate, IntPtr lpType, IntPtr lpName, ushort wLanguage, byte[] lpData, uint cbData);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool EndUpdateResource(IntPtr hUpdate, bool fDiscard);

    static ushort U16(byte[] b, int o) { return (ushort)(b[o] | (b[o+1] << 8)); }
    static short I16(byte[] b, int o) { return unchecked((short)U16(b,o)); }
    static void W16(List<byte> b, ushort v) { b.Add((byte)v); b.Add((byte)(v>>8)); }
    static void W16(List<byte> b, short v) { W16(b, unchecked((ushort)v)); }
    static void W32(List<byte> b, uint v) { b.Add((byte)v); b.Add((byte)(v>>8)); b.Add((byte)(v>>16)); b.Add((byte)(v>>24)); }
    static void WStr(List<byte> b, string s) { foreach(char c in s) W16(b,(ushort)c); W16(b,(ushort)0); }
    static void Align4(List<byte> b) { while((b.Count & 3) != 0) b.Add(0); }

    static byte[] GetDialog(string exe, ushort id, ushort lang) {
        IntPtr h = LoadLibraryEx(exe, IntPtr.Zero, LOAD_LIBRARY_AS_DATAFILE | DONT_RESOLVE_DLL_REFERENCES);
        if(h == IntPtr.Zero) throw new Exception("LoadLibraryEx failed: " + Marshal.GetLastWin32Error());
        try {
            IntPtr fr = FindResourceEx(h, RT_DIALOG, (IntPtr)id, lang);
            if(fr == IntPtr.Zero) throw new Exception("RT_DIALOG " + id + " lang " + lang + " not found. WinErr=" + Marshal.GetLastWin32Error());
            uint sz = SizeofResource(h, fr);
            IntPtr lr = LoadResource(h, fr); IntPtr p = LockResource(lr);
            byte[] data = new byte[sz]; Marshal.Copy(p, data, 0, (int)sz); return data;
        } finally { FreeLibrary(h); }
    }

    static void AddExItem(List<byte> o, uint style, uint exStyle, short x, short y, short cx, short cy, uint id, ushort classAtom, string title) {
        Align4(o);
        W32(o,0); W32(o,exStyle); W32(o,style);
        W16(o,x); W16(o,y); W16(o,cx); W16(o,cy); W32(o,id);
        W16(o,0xFFFF); W16(o,classAtom); WStr(o,title); W16(o,(ushort)0);
    }

    static void AddStdItem(List<byte> o, uint style, uint exStyle, short x, short y, short cx, short cy, ushort id, ushort classAtom, string title) {
        Align4(o);
        W32(o,style); W32(o,exStyle);
        W16(o,x); W16(o,y); W16(o,cx); W16(o,cy); W16(o,id);
        W16(o,0xFFFF); W16(o,classAtom); WStr(o,title); W16(o,(ushort)0);
    }

    public static string Patch(string exe) {
        const ushort dlgId = 125;
        const ushort lang = 1031;
        byte[] src = GetDialog(exe, dlgId, lang);
        bool ex = src.Length >= 26 && U16(src,0) == 1 && U16(src,2) == 0xFFFF;
        int cditOff = ex ? 16 : 8;
        int cxOff = ex ? 22 : 14;
        int cyOff = ex ? 24 : 16;
        ushort oldCount = U16(src,cditOff);
        short dlgCx = I16(src,cxOff), dlgCy = I16(src,cyOff);
        if(dlgCx < 250 || dlgCy < 140) throw new Exception("Unexpected dialog dimensions: " + dlgCx + "x" + dlgCy);

        var o = new List<byte>(src.Length + 192); o.AddRange(src);

        // Position chosen to match the empty area directly under Effect Detail,
        // on the same horizontal band as Extra Geometry and above Scene V1.0.
        short labelX = (short)(dlgCx - 96);
        short comboX = (short)(dlgCx - 58);
        short rowY = 100;
        short labelW = 36, labelH = 10;
        short comboW = 52, comboH = 70;

        const uint WS_CHILD=0x40000000, WS_VISIBLE=0x10000000, WS_TABSTOP=0x00010000;
        const uint WS_VSCROLL=0x00200000;
        const uint SS_LEFT=0x00000000;
        const uint CBS_DROPDOWN=0x00000002, CBS_HASSTRINGS=0x00000200;
        uint staticStyle = WS_CHILD|WS_VISIBLE|SS_LEFT;
        uint comboStyle = WS_CHILD|WS_VISIBLE|WS_TABSTOP|WS_VSCROLL|CBS_DROPDOWN|CBS_HASSTRINGS;

        // Built-in atoms: STATIC=0x0082, COMBOBOX=0x0085.
        if(ex) {
            AddExItem(o, staticStyle, 0, labelX,rowY,labelW,labelH,1710,0x0082,"Language:");
            AddExItem(o, comboStyle, 0, comboX,(short)(rowY-2),comboW,comboH,1711,0x0085,"English");
        } else {
            AddStdItem(o, staticStyle, 0, labelX,rowY,labelW,labelH,1710,0x0082,"Language:");
            AddStdItem(o, comboStyle, 0, comboX,(short)(rowY-2),comboW,comboH,1711,0x0085,"English");
        }

        ushort newCount=(ushort)(oldCount+2);
        o[cditOff]=(byte)newCount; o[cditOff+1]=(byte)(newCount>>8);
        byte[] patched=o.ToArray();

        IntPtr hu=BeginUpdateResource(exe,false);
        if(hu==IntPtr.Zero) throw new Exception("BeginUpdateResource failed: " + Marshal.GetLastWin32Error());
        bool committed=false;
        try {
            if(!UpdateResource(hu,RT_DIALOG,(IntPtr)dlgId,lang,patched,(uint)patched.Length))
                throw new Exception("UpdateResource failed: " + Marshal.GetLastWin32Error());
            if(!EndUpdateResource(hu,false)) throw new Exception("EndUpdateResource failed: " + Marshal.GetLastWin32Error());
            committed=true;
        } finally { if(!committed && hu!=IntPtr.Zero) EndUpdateResource(hu,true); }

        return String.Format("EXP2 patched DIALOG 125: {0}->{1} controls, dialog={2}x{3}, Language dropdown at x={4}, y={5}",oldCount,newCount,dlgCx,dlgCy,comboX,rowY-2);
    }
}
'@

Add-Type -TypeDefinition $src -Language CSharp
$result=[ZmsLangExp2]::Patch($Exe)
Write-Host $result
Write-Host ""
Write-Host "EXP2 replaces the EXP1 radio buttons with a native ComboBox in the free area under Effect Detail."
Write-Host "The dropdown is visual only for this test; runtime item population and language switching are the next hook."
Write-Host "Restore with: powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Exe `"$Exe`" -Restore"
