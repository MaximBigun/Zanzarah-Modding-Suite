#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdio.h>
#include <string.h>

#define IDC_LANGUAGE 1711
#define ZMS_PROP "ZMS_ORIG_DLGPROC"

static HINSTANCE g_hinst = NULL;
static DLGPROC g_pending_proc = NULL;

static void get_paths(char *root, char *data, char *loc, char *ini, char *logp, size_t cap){
    char sys[MAX_PATH];
    GetModuleFileNameA(g_hinst, sys, MAX_PATH);
    char *p = strrchr(sys, '\\'); if(p) *p = 0;
    p = strrchr(sys, '\\'); if(p) *p = 0;
    lstrcpynA(root, sys, (int)cap);
    wsprintfA(data, "%s\\Data", root);
    wsprintfA(loc, "%s\\Localization", root);
    wsprintfA(ini, "%s\\Localization\\zms_language.ini", root);
    wsprintfA(logp, "%s\\Localization\\zms_language_exp44.log", root);
}

static void log_line(const char *text){
    char root[MAX_PATH], data[MAX_PATH], loc[MAX_PATH], ini[MAX_PATH], logp[MAX_PATH];
    get_paths(root,data,loc,ini,logp,MAX_PATH);
    CreateDirectoryA(loc,NULL);
    HANDLE h=CreateFileA(logp,FILE_APPEND_DATA,FILE_SHARE_READ|FILE_SHARE_WRITE,NULL,OPEN_ALWAYS,FILE_ATTRIBUTE_NORMAL,NULL);
    if(h==INVALID_HANDLE_VALUE) return;
    DWORD n=0; WriteFile(h,text,(DWORD)lstrlenA(text),&n,NULL); WriteFile(h,"\r\n",2,&n,NULL); CloseHandle(h);
}

static void log_template(const char *api, LPCSTR templ){
    char s[256];
    if(IS_INTRESOURCE(templ)) wsprintfA(s,"%s template=%u",api,(unsigned)(ULONG_PTR)templ);
    else wsprintfA(s,"%s template=str:%s",api,templ?templ:"(null)");
    log_line(s);
}

static BOOL set_complete(const char *dir){
    char p[MAX_PATH];
    for(int i=0;i<7;i++){
        wsprintfA(p, "%s\\_fb0x%02d.fbs", dir, i);
        if(GetFileAttributesA(p)==INVALID_FILE_ATTRIBUTES) return FALSE;
    }
    return TRUE;
}

static BOOL apply_language(int lang){
    char root[MAX_PATH], data[MAX_PATH], loc[MAX_PATH], ini[MAX_PATH], logp[MAX_PATH];
    char srcdir[MAX_PATH], src[MAX_PATH], dst[MAX_PATH], value[8], msg[160];
    get_paths(root,data,loc,ini,logp,MAX_PATH);
    CreateDirectoryA(loc,NULL);
    wsprintfA(srcdir, "%s\\%s", loc, lang ? "ru" : "en");
    if(!set_complete(srcdir)){
        wsprintfA(msg,"apply_language failed: incomplete %s",srcdir); log_line(msg); return FALSE;
    }
    for(int i=0;i<7;i++){
        wsprintfA(src, "%s\\_fb0x%02d.fbs", srcdir, i);
        wsprintfA(dst, "%s\\_fb0x%02d.fbs", data, i);
        if(!CopyFileA(src,dst,FALSE)){
            wsprintfA(msg,"copy failed %s -> %s err=%lu",src,dst,GetLastError()); log_line(msg); return FALSE;
        }
    }
    wsprintfA(value, "%d", lang ? 1 : 0);
    WritePrivateProfileStringA("ZMS","Language",value,ini);
    wsprintfA(msg,"language applied=%s",lang?"ru":"en"); log_line(msg);
    return TRUE;
}

static int load_language(void){
    char root[MAX_PATH], data[MAX_PATH], loc[MAX_PATH], ini[MAX_PATH], logp[MAX_PATH];
    get_paths(root,data,loc,ini,logp,MAX_PATH);
    return GetPrivateProfileIntA("ZMS","Language",0,ini) ? 1 : 0;
}

static BOOL fill_combo(HWND dlg){
    HWND c=GetDlgItem(dlg,IDC_LANGUAGE);
    if(!c) return FALSE;
    SendMessageA(c,CB_RESETCONTENT,0,0);
    SendMessageA(c,CB_ADDSTRING,0,(LPARAM)"English");
    SendMessageA(c,CB_ADDSTRING,0,(LPARAM)"Russian");
    SendMessageA(c,CB_SETCURSEL,(WPARAM)load_language(),0);
    log_line("combo 1711 found and filled");
    return TRUE;
}

static INT_PTR CALLBACK HookDlgProc(HWND hDlg, UINT msg, WPARAM wParam, LPARAM lParam){
    DLGPROC orig=(DLGPROC)GetPropA(hDlg,ZMS_PROP);
    if(msg==WM_INITDIALOG){
        orig=g_pending_proc;
        if(orig) SetPropA(hDlg,ZMS_PROP,(HANDLE)orig);
        INT_PTR r=orig ? orig(hDlg,msg,wParam,lParam) : FALSE;
        if(!fill_combo(hDlg)) log_line("wm_initdialog: combo 1711 not present");
        return r;
    }
    if(msg==WM_COMMAND && LOWORD(wParam)==IDC_LANGUAGE && HIWORD(wParam)==CBN_SELCHANGE){
        HWND c=(HWND)lParam;
        int sel=(int)SendMessageA(c,CB_GETCURSEL,0,0);
        if(sel==0 || sel==1) apply_language(sel);
    }
    INT_PTR r=orig ? orig(hDlg,msg,wParam,lParam) : FALSE;
    if(msg==WM_NCDESTROY) RemovePropA(hDlg,ZMS_PROP);
    return r;
}

__declspec(dllexport) INT_PTR WINAPI ZmsDialogBoxParamA(HINSTANCE hInst,LPCSTR templ,HWND parent,DLGPROC proc,LPARAM param){
    log_template("DialogBoxParamA",templ);
    g_pending_proc=proc;
    return DialogBoxParamA(hInst,templ,parent,HookDlgProc,param);
}

__declspec(dllexport) HWND WINAPI ZmsCreateDialogParamA(HINSTANCE hInst,LPCSTR templ,HWND parent,DLGPROC proc,LPARAM param){
    log_template("CreateDialogParamA",templ);
    g_pending_proc=proc;
    return CreateDialogParamA(hInst,templ,parent,HookDlgProc,param);
}

BOOL WINAPI DllMain(HINSTANCE h,DWORD reason,LPVOID reserved){
    if(reason==DLL_PROCESS_ATTACH){
        g_hinst=h;
        DisableThreadLibraryCalls(h);
        log_line("exp4.4 dll loaded");
    }
    return TRUE;
}
