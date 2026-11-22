Unicode true
ManifestDPIAware true

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

!define APP_NAME "Dalmg"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Dalmg"
!define APP_URL "https://dalmg.dev"
!define APP_EXE "Dalmg.exe"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Dalmg"

Name "${APP_NAME}"
OutFile "..\release\Dalmg-Setup-${APP_VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\Dalmg"
InstallDirRegKey HKCU "Software\Dalmg" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "${APP_NAME} ${APP_VERSION}"

VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "FileDescription" "Dalmg — конструктор сайтов"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "ProductVersion" "${APP_VERSION}"
VIAddVersionKey "CompanyName" "${APP_PUBLISHER}"
VIAddVersionKey "LegalCopyright" "© 2026 ${APP_PUBLISHER}"

!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Установка ${APP_NAME}"
!define MUI_WELCOMEPAGE_TEXT "Dalmg — настольное приложение конструктора сайтов.$\r$\n$\r$\nУстановка не требует прав администратора: файлы будут размещены в профиле пользователя.$\r$\n$\r$\nНажмите «Далее», чтобы продолжить."
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

Section "Dalmg" SecMain
  SetOutPath "$INSTDIR"
  File /r "..\release\Dalmg-win-x64\*.*"

  CreateShortcut "$DESKTOP\Dalmg.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\resources\app\build\icon.ico" 0 SW_SHOWNORMAL "" "Dalmg — конструктор сайтов"
  CreateDirectory "$SMPROGRAMS\Dalmg"
  CreateShortcut "$SMPROGRAMS\Dalmg\Dalmg.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\resources\app\build\icon.ico" 0
  CreateShortcut "$SMPROGRAMS\Dalmg\Удалить Dalmg.lnk" "$INSTDIR\Uninstall.exe"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  WriteRegStr HKCU "Software\Dalmg" "InstallDir" "$INSTDIR"
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
  Delete "$DESKTOP\Dalmg.lnk"
  Delete "$SMPROGRAMS\Dalmg\Dalmg.lnk"
  Delete "$SMPROGRAMS\Dalmg\Удалить Dalmg.lnk"
  RMDir "$SMPROGRAMS\Dalmg"

  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.pak"
  Delete "$INSTDIR\*.bin"
  Delete "$INSTDIR\*.dat"
  Delete "$INSTDIR\*.exe"
  Delete "$INSTDIR\*.json"
  Delete "$INSTDIR\*.txt"
  Delete "$INSTDIR\Dalmg.lnk"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "${UNINST_KEY}"
  DeleteRegKey HKCU "Software\Dalmg"
SectionEnd
