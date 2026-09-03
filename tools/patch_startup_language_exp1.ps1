param(
    [Parameter(Mandatory=$false)][string]$Exe = ".\zanthp.exe",
    [switch]$Restore
)

$ErrorActionPreference = 'Stop'
$Exe = (Resolve-Path $Exe).Path
$Backup = $Exe + '.zms_lang_exp1_backup'

if ($Restore) {
    if (!(Test-Path $Backup)) { throw "Backup not found: $Backup" }
    Copy-Item -Force $Backup $Exe
    Write-Host "Restored original EXE from: $Backup"
    exit 0
}

if (!(Test-Path $Backup)) {
    Copy-Item $Exe $Backup
    Write-Host "Backup created: $Backup"
} else {
    Write-Host "Backup already exists: $Backup"
}

$src = @'
using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class ZmsLangExp1 {
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
    static uint U32(byte[] b, int o) { return (uint)(b[o] | (b[o+1]<<8) | (b[o+2]<<16) | (b[o+3]<<24)); }
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

    static void AddExItem(List<byte> o, uint style, short x, short y, short cx, short cy, uint id, ushort classAtom, string title) {
        Align4(o);
        W32(o,0);              // helpID
        W32(o,0);              // exStyle
        W32(o,style);
        W16(o,x); W16(o,y); W16(o,cx); W16(o,cy);
        W32(o,id);
        W16(o,0xFFFF); W16(o,classAtom);
        WStr(o,title);
        W16(o,(ushort)0);      // extraCount
    }

    static void AddStdItem(List<byte> o, uint style, short x, short y, short cx, short cy, ushort id, ushort classAtom, string title) {
        Align4(o);
        W32(o,style); W32(o,0);
        W16(o,x); W16(o,y); W16(o,cx); W16(o,cy); W16(o,id);
        W16(o,0xFFFF); W16(o,classAtom);
        WStr(o,title);
        W16(o,(ushort)0);
    }

    static bool ContainsUtf16(byte[] b, string text) {
        byte[] s = Encoding.Unicode.GetBytes(text);
        for(int i=0;i+s.Length<=b.Length;i++) { int j=0; for(;j<s.Length;j++) if(b[i+j]!=s[j]) break; if(j==s.Length) return true; }
        return false;
    }

    public static string Patch(string exe) {
        const ushort dlgId = 125;
        const ushort lang = 1031;
        byte[] src = GetDialog(exe, dlgId, lang);
        if(ContainsUtf16(src,"Русский") || ContainsUtf16(src,"ZMS Language")) return "Dialog 125 already appears patched.";

        bool ex = src.Length >= 26 && U16(src,0) == 1 && U16(src,2) == 0xFFFF;
        int cditOff, cxOff, cyOff;
        ushort oldCount; short dlgCx, dlgCy;
        if(ex) {
            cditOff=16; cxOff=22; cyOff=24;
        } else {
            cditOff=8; cxOff=14; cyOff=16;
        }
        oldCount=U16(src,cditOff); dlgCx=I16(src,cxOff); dlgCy=I16(src,cyOff);
        if(dlgCx < 80 || dlgCy < 60) throw new Exception("Unexpected dialog dimensions: " + dlgCx + "x" + dlgCy);

        var o = new List<byte>(src.Length + 256); o.AddRange(src);
        short gx = 8;
        short gy = (short)Math.Max(8, dlgCy - 42);
        short gw = (short)Math.Max(80, dlgCx - 16);
        short gh = 36;

        // Win32 built-in class atoms: 0x0080 BUTTON.
        const uint WS_CHILD=0x40000000, WS_VISIBLE=0x10000000, WS_TABSTOP=0x00010000, WS_GROUP=0x00020000;
        const uint BS_GROUPBOX=0x00000007, BS_AUTORADIOBUTTON=0x00000009;
        uint groupStyle = WS_CHILD|WS_VISIBLE|BS_GROUPBOX;
        uint radio1Style = WS_CHILD|WS_VISIBLE|WS_TABSTOP|WS_GROUP|BS_AUTORADIOBUTTON;
        uint radio2Style = WS_CHILD|WS_VISIBLE|WS_TABSTOP|BS_AUTORADIOBUTTON;

        if(ex) {
            AddExItem(o, groupStyle, gx, gy, gw, gh, 1700, 0x0080, "Language");
            AddExItem(o, radio1Style, (short)(gx+10), (short)(gy+12), 52, 12, 1701, 0x0080, "English");
            AddExItem(o, radio2Style, (short)(gx+70), (short)(gy+12), 55, 12, 1702, 0x0080, "Русский");
        } else {
            AddStdItem(o, groupStyle, gx, gy, gw, gh, 1700, 0x0080, "Language");
            AddStdItem(o, radio1Style, (short)(gx+10), (short)(gy+12), 52, 12, 1701, 0x0080, "English");
            AddStdItem(o, radio2Style, (short)(gx+70), (short)(gy+12), 55, 12, 1702, 0x0080, "Русский");
        }

        ushort newCount = (ushort)(oldCount + 3);
        o[cditOff]=(byte)newCount; o[cditOff+1]=(byte)(newCount>>8);
        byte[] patched=o.ToArray();

        IntPtr hu = BeginUpdateResource(exe,false);
        if(hu==IntPtr.Zero) throw new Exception("BeginUpdateResource failed: " + Marshal.GetLastWin32Error());
        bool committed=false;
        try {
            if(!UpdateResource(hu,RT_DIALOG,(IntPtr)dlgId,lang,patched,(uint)patched.Length))
                throw new Exception("UpdateResource failed: " + Marshal.GetLastWin32Error());
            if(!EndUpdateResource(hu,false)) throw new Exception("EndUpdateResource failed: " + Marshal.GetLastWin32Error());
            committed=true;
        } finally {
            if(!committed && hu!=IntPtr.Zero) EndUpdateResource(hu,true);
        }
        return String.Format("EXP1 patched DIALOG 125: {0} template, {1} -> {2} controls, dialog={3}x{4}, language box at x={5}, y={6}, w={7}, h={8}", ex?"DLGTEMPLATEEX":"DLGTEMPLATE", oldCount,newCount,dlgCx,dlgCy,gx,gy,gw,gh);
    }
}
'@

Add-Type -TypeDefinition $src -Language CSharp
$result = [ZmsLangExp1]::Patch($Exe)
Write-Host $result
Write-Host ""
Write-Host "EXP1 only adds visible Language / English / Russian radio controls."
Write-Host "It does NOT switch localization files yet."
Write-Host "To restore:"
Write-Host "  powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Exe `"$Exe`" -Restore"
