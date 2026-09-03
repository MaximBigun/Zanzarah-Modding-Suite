#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdio.h>
#include <string.h>

#define ZMS_COMBO_ID 1711
#define CB_ADDSTRING 0x0143
#define CB_RESETCONTENT 0x014B
#define CB_SETCURSEL 0x014E
#define CB_GETCURSEL 0x0147

typedef struct {
    HWND found;
} FindCtx;

static BOOL CALLBACK FindStartupProc(HWND hWnd, LPARAM lParam) {
    char title[512];
    if (!IsWindowVisible(hWnd)) return TRUE;
    title[0] = '\0';
    GetWindowTextA(hWnd, title, sizeof(title));
    if (strstr(title, "Startup Menu") != NULL) {
        ((FindCtx*)lParam)->found = hWnd;
        return FALSE;
    }
    return TRUE;
}

static BOOL CALLBACK FindComboProc(HWND hWnd, LPARAM lParam) {
    if (GetDlgCtrlID(hWnd) == ZMS_COMBO_ID) {
        ((FindCtx*)lParam)->found = hWnd;
        return FALSE;
    }
    return TRUE;
}

static HWND find_startup(void) {
    FindCtx ctx = {0};
    EnumWindows(FindStartupProc, (LPARAM)&ctx);
    return ctx.found;
}

static HWND find_combo(HWND startup) {
    FindCtx ctx = {0};
    if (startup) EnumChildWindows(startup, FindComboProc, (LPARAM)&ctx);
    return ctx.found;
}

static void path_dirname(char *path) {
    char *p = strrchr(path, '\\');
    if (p) *p = '\0';
}

static void build_paths(char *root, size_t rootCap, char *ini, size_t iniCap) {
    char exe[MAX_PATH];
    GetModuleFileNameA(NULL, exe, MAX_PATH);
    exe[MAX_PATH-1] = '\0';
    path_dirname(exe); /* ...\\System */
    lstrcpynA(root, exe, (int)rootCap);
    path_dirname(root); /* game root */
    wsprintfA(ini, "%s\\Localization\\zms_language.ini", root);
}

static BOOL test_file(const char *path) {
    DWORD a = GetFileAttributesA(path);
    return a != INVALID_FILE_ATTRIBUTES && !(a & FILE_ATTRIBUTE_DIRECTORY);
}

static BOOL apply_language(const char *root, int lang) {
    const char *code = lang ? "ru" : "en";
    char src[MAX_PATH], dst[MAX_PATH];
    int i;

    for (i = 0; i <= 6; ++i) {
        wsprintfA(src, "%s\\Localization\\%s\\_fb0x%02d.fbs", root, code, i);
        if (!test_file(src)) return FALSE;
    }
    for (i = 0; i <= 6; ++i) {
        wsprintfA(src, "%s\\Localization\\%s\\_fb0x%02d.fbs", root, code, i);
        wsprintfA(dst, "%s\\Data\\_fb0x%02d.fbs", root, i);
        if (!CopyFileA(src, dst, FALSE)) return FALSE;
    }
    return TRUE;
}

static void fill_combo(HWND combo, int selected) {
    SendMessageA(combo, CB_RESETCONTENT, 0, 0);
    SendMessageA(combo, CB_ADDSTRING, 0, (LPARAM)"English");
    SendMessageA(combo, CB_ADDSTRING, 0, (LPARAM)"Russian");
    SendMessageA(combo, CB_SETCURSEL, (WPARAM)selected, 0);
}

static DWORD WINAPI worker(LPVOID unused) {
    char root[MAX_PATH], ini[MAX_PATH];
    HWND startup = NULL, combo = NULL;
    int selected, last;
    DWORD waited = 0;
    (void)unused;

    build_paths(root, sizeof(root), ini, sizeof(ini));
    selected = (int)GetPrivateProfileIntA("ZMS", "Language", 0, ini);
    if (selected != 1) selected = 0;
    last = selected;

    /* Apply persisted language before user presses Start. */
    apply_language(root, selected);

    while (waited < 120000) {
        startup = find_startup();
        if (startup) break;
        Sleep(100);
        waited += 100;
    }
    if (!startup) return 0;

    while (IsWindow(startup)) {
        if (!combo || !IsWindow(combo)) {
            combo = find_combo(startup);
            if (combo) fill_combo(combo, last);
        }

        if (combo && IsWindow(combo)) {
            LRESULT cur = SendMessageA(combo, CB_GETCURSEL, 0, 0);
            if ((cur == 0 || cur == 1) && (int)cur != last) {
                int requested = (int)cur;
                if (apply_language(root, requested)) {
                    last = requested;
                    WritePrivateProfileStringA("ZMS", "Language", requested ? "1" : "0", ini);
                } else {
                    fill_combo(combo, last);
                    MessageBoxA(startup,
                        requested ? "Russian localization pack is incomplete. Check Localization\\ru." : "English localization pack is incomplete. Check Localization\\en.",
                        "ZMS Language EXP4", MB_OK | MB_ICONWARNING);
                }
            }
        }
        Sleep(100);
    }
    return 0;
}

BOOL WINAPI DllMain(HINSTANCE hinst, DWORD reason, LPVOID reserved) {
    (void)hinst; (void)reserved;
    if (reason == DLL_PROCESS_ATTACH) {
        HANDLE h;
        DisableThreadLibraryCalls(hinst);
        h = CreateThread(NULL, 0, worker, NULL, 0, NULL);
        if (h) CloseHandle(h);
    }
    return TRUE;
}
