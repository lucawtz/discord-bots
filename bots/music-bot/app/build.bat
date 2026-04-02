@echo off
set MSVC=C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\14.50.35717
set WINSDK=C:\Program Files (x86)\Windows Kits\10
set WINSDK_VER=10.0.26100.0

set PATH=%MSVC%\bin\Hostarm64\x64;%USERPROFILE%\.cargo\bin;%PATH%
set INCLUDE=%MSVC%\include;%WINSDK%\Include\%WINSDK_VER%\ucrt;%WINSDK%\Include\%WINSDK_VER%\um;%WINSDK%\Include\%WINSDK_VER%\shared
set LIB=%MSVC%\lib\x64;%WINSDK%\Lib\%WINSDK_VER%\ucrt\x64;%WINSDK%\Lib\%WINSDK_VER%\um\x64

echo Building Tauri app...
tauri build --target x86_64-pc-windows-msvc
