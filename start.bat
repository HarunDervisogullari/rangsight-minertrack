@echo off
setlocal

echo ===================================================
echo Ransight Docker Ortami Baslatiliyor...
echo ===================================================

REM Docker kontrolu
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker calismiyor veya yuklu degil. Lutfen Docker Desktop'i baslatin.
    pause
    exit /b 1
)

echo Frontend imaji temiz cache ile yeniden insa ediliyor...
docker compose build --no-cache dashboard-frontend

if %errorlevel% neq 0 (
    echo Frontend build sirasinda hata olustu.
    pause
    exit /b 1
)

echo Konteynerler insa ediliyor ve baslatiliyor...
docker compose up -d --build

if %errorlevel% neq 0 (
    echo Docker Compose baslatilirken hata olustu.
    pause
    exit /b 1
)

echo.
echo PostgreSQL servisinin hazir olmasi bekleniyor...
:wait_for_postgres
timeout /t 2 /nobreak > nul
docker exec ransight-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo Postgres henuz hazir degil, bekleniyor...
    goto wait_for_postgres
)
echo PostgreSQL hazir!

echo.
echo Veritabani yedegi kontrol ediliyor...
if exist current_db_backup.sql (
    echo Yedek dosyasi bulundu: current_db_backup.sql
    echo Veritabani geri yukleniyor...
    docker exec -i ransight-postgres psql -U postgres -d ransight < current_db_backup.sql
    if %errorlevel% equ 0 (
        echo Veritabani basariyla yuklendi.
    ) else (
        echo Veritabani yuklenirken hata olustu!
    )
) else (
    echo UYARI: current_db_backup.sql dosyasi bulunamadi. Veritabani bos baslatildi.
    echo Eger bir yedek yuklemek isterseniz, dosyayi bu dizine koyup scripti tekrar calistirin.
)

echo.
echo ===================================================
echo Servisler calisiyor:
echo Frontend Dashboard: http://localhost:3000
echo Auth Service:       http://localhost:8000
echo Device Service:     http://localhost:8080
echo Gallery Service:    http://localhost:8081
echo Person Service:     http://localhost:8082
echo Mine Dashboard API: http://localhost:8001
echo InfluxDB:          http://localhost:8086
echo ===================================================

echo.
echo Tarayici aciliyor...
start http://localhost:3000

echo Islem tamamlandi. Pencereyi kapatabilirsiniz.
pause
