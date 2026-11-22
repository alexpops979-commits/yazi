Unicode true
ManifestDPIAware true

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

!define APP_NAME "Yazi"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Yazi"
!define APP_URL "https://yazi.dev"
!define APP_EXE "Yazi.exe"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Yazi"

Name "${APP_NAME}"
OutFile "..\release\Yazi-Setup-${APP_VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\Yazi"
InstallDirRegKey HKCU "Software\Yazi" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "${APP_NAME} ${APP_VERSION}"

VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "FileDescription" "Yazi — конструктор сайтов"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "ProductVersion" "${APP_VERSION}"
VIAddVersionKey "CompanyName" "${APP_PUBLISHER}"
VIAddVersionKey "LegalCopyright" "© 2026 ${APP_PUBLISHER}"

!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Установка ${APP_NAME}"
!define MUI_WELCOMEPAGE_TEXT "Yazi — настольное приложение конструктора сайтов.$\r$\n$\r$\nУстановка не требует прав администратора: файлы будут размещены в профиле пользователя.$\r$\n$\r$\nНажмите «Далее», чтобы продолжить."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Запустить ${APP_NAME}"
!define MUI_FINISHPAGE_LINK "Сайт продукта"
!define MUI_FINISHPAGE_LINK_LOCATION "${APP_URL}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Russian"
!insertmacro MUI_LANGUAGE "English"

Section "Yazi" SecMain
  SetOutPath "$INSTDIR"
  File /r "..\release\Yazi-win-x64\*.*"

  CreateShortcut "$DESKTOP\Yazi.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\resources\app\build\icon.ico" 0 SW_SHOWNORMAL "" "Yazi — конструктор сайтов"
  CreateDirectory "$SMPROGRAMS\Yazi"
  CreateShortcut "$SMPROGRAMS\Yazi\Yazi.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\resources\app\build\icon.ico" 0
  CreateShortcut "$SMPROGRAMS\Yazi\Удалить Yazi.lnk" "$INSTDIR\Uninstall.exe"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  WriteRegStr HKCU "Software\Yazi" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${APP_NAME} — конструктор сайтов"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\resources\app\build\icon.ico"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1

  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" "$0"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\Yazi.lnk"
  Delete "$SMPROGRAMS\Yazi\Yazi.lnk"
  Delete "$SMPROGRAMS\Yazi\Удалить Yazi.lnk"
  RMDir "$SMPROGRAMS\Yazi"

  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.pak"
  Delete "$INSTDIR\*.bin"
  Delete "$INSTDIR\*.dat"
  Delete "$INSTDIR\*.exe"
  Delete "$INSTDIR\*.json"
  Delete "$INSTDIR\*.txt"
  Delete "$INSTDIR\Yazi.lnk"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "${UNINST_KEY}"
  DeleteRegKey HKCU "Software\Yazi"
SectionEnd
