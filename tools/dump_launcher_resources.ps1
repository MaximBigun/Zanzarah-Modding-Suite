param(
  [Parameter(Mandatory=$false)][string]$Exe = ".\zanthp.exe",
  [Parameter(Mandatory=$false)][string]$Out = ".\launcher_resource_dump"
)
$ErrorActionPreference='Stop'
$Exe=(Resolve-Path $Exe).Path
New-Item -ItemType Directory -Force -Path $Out | Out-Null

$src=@'
using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class ZResDump {
  const uint LOAD_LIBRARY_AS_DATAFILE=0x00000002;
  const uint DONT_RESOLVE_DLL_REFERENCES=0x00000001;
  static IntPtr RT_MENU=(IntPtr)4, RT_DIALOG=(IntPtr)5, RT_STRING=(IntPtr)6;

  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr LoadLibraryEx(string lpFileName, IntPtr hFile, uint flags);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool FreeLibrary(IntPtr h);
  delegate bool EnumResNameProc(IntPtr h, IntPtr type, IntPtr name, IntPtr param);
  delegate bool EnumResLangProc(IntPtr h, IntPtr type, IntPtr name, ushort lang, IntPtr param);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool EnumResourceNames(IntPtr h, IntPtr type, EnumResNameProc cb, IntPtr param);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool EnumResourceLanguages(IntPtr h, IntPtr type, IntPtr name, EnumResLangProc cb, IntPtr param);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr FindResourceEx(IntPtr h, IntPtr type, IntPtr name, ushort lang);
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr LoadResource(IntPtr h, IntPtr res);
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr LockResource(IntPtr res);
  [DllImport("kernel32.dll", SetLastError=true)] static extern uint SizeofResource(IntPtr h, IntPtr res);

  static string Id(IntPtr p){ long v=p.ToInt64(); return ((ulong)v<=0xFFFFUL) ? v.ToString() : Marshal.PtrToStringUni(p); }
  static string Safe(string s){ foreach(char c in Path.GetInvalidFileNameChars()) s=s.Replace(c,'_'); return s; }
  static List<string> Strings(byte[] b){
    var r=new List<string>(); var sb=new StringBuilder();
    for(int i=0;i+1<b.Length;i+=2){ ushort ch=(ushort)(b[i]|(b[i+1]<<8));
      if(ch>=0x20 && ch!=0x7f){ sb.Append((char)ch); }
      else { if(sb.Length>=3) r.Add(sb.ToString()); sb.Clear(); }
    }
    if(sb.Length>=3) r.Add(sb.ToString()); return r;
  }
  static void DumpType(IntPtr h, IntPtr type, string typeName, string outDir, StreamWriter report){
    int count=0;
    EnumResNameProc ncb = null;
    ncb=(hh,tt,name,param)=>{
      string nid=Id(name); count++;
      EnumResLangProc lcb=null;
      lcb=(hhh,ttt,nn,lang,pp)=>{
        IntPtr fr=FindResourceEx(hhh,ttt,nn,lang); uint sz=SizeofResource(hhh,fr); IntPtr lr=LoadResource(hhh,fr); IntPtr ptr=LockResource(lr);
        byte[] data=new byte[sz]; Marshal.Copy(ptr,data,0,(int)sz);
        string fn=Safe(typeName+"_"+nid+"_lang"+lang+"_"+sz+".bin"); File.WriteAllBytes(Path.Combine(outDir,fn),data);
        report.WriteLine("[{0}] id={1} lang={2} size={3} file={4}",typeName,nid,lang,sz,fn);
        foreach(string s in Strings(data)) report.WriteLine("    U16: "+s);
        return true;
      };
      EnumResourceLanguages(hh,tt,name,lcb,IntPtr.Zero); return true;
    };
    bool ok=EnumResourceNames(h,type,ncb,IntPtr.Zero);
    report.WriteLine("{0}: EnumResourceNames={1}, count={2}, winerr={3}",typeName,ok,count,Marshal.GetLastWin32Error());
  }
  public static void Run(string exe,string outDir){
    Directory.CreateDirectory(outDir);
    using(var report=new StreamWriter(Path.Combine(outDir,"report.txt"),false,new UTF8Encoding(true))){
      report.WriteLine("EXE: "+exe);
      IntPtr h=LoadLibraryEx(exe,IntPtr.Zero,LOAD_LIBRARY_AS_DATAFILE|DONT_RESOLVE_DLL_REFERENCES);
      if(h==IntPtr.Zero) throw new Exception("LoadLibraryEx failed: "+Marshal.GetLastWin32Error());
      try { DumpType(h,RT_DIALOG,"DIALOG",outDir,report); DumpType(h,RT_MENU,"MENU",outDir,report); DumpType(h,RT_STRING,"STRING",outDir,report); }
      finally { FreeLibrary(h); }
    }
  }
}
'@
Add-Type -TypeDefinition $src -Language CSharp
[ZResDump]::Run($Exe,(Resolve-Path $Out).Path)
Write-Host "Done: $Out\report.txt"
Get-Content "$Out\report.txt"
