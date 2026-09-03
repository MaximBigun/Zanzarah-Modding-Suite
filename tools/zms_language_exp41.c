#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdio.h>

#define IDC_LANGUAGE 1711
#define ZMS_PROP "ZMS_ORIG_DLGPROC"

static HINSTANCE g_hinst = NULL;
static DLGPROC g_pending_proc = NULL;

static void get_paths(char *root, char *data, char *loc, char *ini, size_t cap){
    char sys[MAX_PATH];
    GetModuleFileNameA(g_hinst, sys, MAX_PATH);
    char *p = strrchr(sys, '\\'); if(p) *p = 0;
    p = strrchr(sys, '\\'); if(p) *p = 0;
    lstrcpynA(root, sys, (int)cap);
    wsprintfA(data, "%s\\Data", root);
    wsprintfA(loc, "%s\\Localization", root);
    wsprintfA(ini, "%s\\Localization\\zms_language.ini", root);
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
    char root[MAX_PATH], data[MAX_PATH], loc[MAX_PATH], ini[MAX_PATH];
    char srcdir[MAX_PATH], src[MAX_PATH], dst[MAX_PATH], value[8];
    get_paths(root,data,loc,ini,MAX_PATH);
    wsprintfA(srcdir, "%s\\%s", loc, lang ? "ru" : "en");
    if(!set_complete(srcdir)) return FALSE;
    for(int i=0;i<7;i++){
        wsprintfA(src, "%s\\_fb0x%02d.fbs", srcdir, i);
        wsprintfA(dst, "%s\\_fb0x%02d.fbs", data, i);
        if(!CopyFileA(src,dst,FALSE)) return FALSE;
    }
    wsprintfA(value, "%d", lang ? 1 : 0);
    WritePrivateProfileStringA("ZMS","Language",value,ini);
    return TRUE;
}

static int load_language(void){
    char root[MAX_PATH], data[MAX_PATH], loc[MAX_PATH], ini[MAX_PATH];
    get_paths(root,data,loc,ini,MAX_PATH);
    return GetPrivateProfileIntA("ZMS","Language",0,ini) ? 1 : 0;
}

static void fill_combo(HWND dlg){
    HWND c=GetDlgItem(dlg,IDC_LANGUAGE);
    if(!c) return;
    SendMessageA(c,CB_RESETCONTENT,0,0);
    SendMessageA(c,CB_ADDSTRING,0,(LPARAM)"English");
    SendMessageA(c,CB_ADDSTRING,0,(LPARAM)"Russian");
    SendMessageA(c,CB_SETCURSEL,(WPARAM)load_language(),0);
}

static INT_PTR CALLBACK HookDlgProc(HWND hDlg, UINT msg, WPARAM wParam, LPARAM lParam){
    DLGPROC orig=(DLGPROC)GetPropA(hDlg,ZMS_PROP);
    if(msg==WM_INITDIALOG){
        orig=g_pending_proc;
        if(orig) SetPropA(hDlg,ZMS_PROP,(HANDLE)orig);
        INT_PTR r=orig ? orig(hDlg,msg,wParam,lParam) : FALSE;
        fill_combo(hDlg);
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
    if(IS_INTRESOURCE(templ) && (ULONG_PTR)templ==125){
        g_pending_proc=proc;
        return DialogBoxParamA(hInst,templ,parent,HookDlgProc,param);
    }
    return DialogBoxParamA(hInst,templ,parent,proc,param);
}

__declspec(dllexport) HWND WINAPI ZmsCreateDialogParamA(HINSTANCE hInst,LPCSTR templ,HWND parent,DLGPROC proc,LPARAM param){
    if(IS_INTRESOURCE(templ) && (ULONG_PTR)templ==125){
        g_pending_proc=proc;
        return CreateDialogParamA(hInst,templ,parent,HookDlgProc,param);
    }
    return CreateDialogParamA(hInst,templ,parent,proc,param);
}

BOOL WINAPI DllMain(HINSTANCE h,DWORD reason,LPVOID reserved){
    if(reason==DLL_PROCESS_ATTACH){g_hinst=h;DisableThreadLibraryCalls(h);} return TRUE;
}
