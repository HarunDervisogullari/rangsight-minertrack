#!/bin/bash

echo "==================================================="
echo "Ransight Docker Ortami Baslatiliyor..."
echo "==================================================="

# Docker kontrolu
docker info >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Docker calismiyor veya yuklu degil. Lutfen Docker Desktop'i baslatin."
    exit 1
fi

echo "Frontend imaji temiz cache ile yeniden insa ediliyor..."
docker compose build --no-cache dashboard-frontend

if [ $? -ne 0 ]; then
    echo "Frontend build sirasinda hata olustu."
    exit 1
fi

echo "Konteynerler insa ediliyor ve baslatiliyor..."
docker compose up -d --build

if [ $? -ne 0 ]; then
    echo "Docker Compose baslatilirken hata olustu."
    exit 1
fi

echo ""
echo "PostgreSQL servisinin hazir olmasi bekleniyor..."

# PostgreSQL bekleme döngüsü
while ! docker exec ransight-postgres pg_isready -U postgres >/dev/null 2>&1; do
    echo "Postgres henuz hazir degil, bekleniyor..."
    sleep 2
done

echo "PostgreSQL hazir!"

echo ""
echo "Veritabani yedegi kontrol ediliyor..."
if [ -f "current_db_backup.sql" ]; then
    echo "Yedek dosyasi bulundu: current_db_backup.sql"
    echo "Veritabani geri yukleniyor..."
    docker exec -i ransight-postgres psql -U postgres -d ransight < current_db_backup.sql
    if [ $? -eq 0 ]; then
        echo "Veritabani basariyla yuklendi."
    else
        echo "Veritabani yuklenirken hata olustu!"
    fi
else
    echo "UYARI: current_db_backup.sql dosyasi bulunamadi. Veritabani bos baslatildi."
    echo "Eger bir yedek yuklemek isterseniz, dosyayi bu dizine koyup scripti tekrar calistirin."
fi

echo ""
echo "==================================================="
echo "Servisler calisiyor:"
echo "Frontend Dashboard: http://localhost:3000"
echo "Auth Service:       http://localhost:8000"
echo "Device Service:     http://localhost:8080"
echo "Gallery Service:    http://localhost:8081"
echo "Person Service:     http://localhost:8082"
echo "Mine Dashboard API: http://localhost:8001"
echo "InfluxDB:          http://localhost:8086"
echo "==================================================="

echo ""
echo "Tarayici aciliyor..."
# macOS için open komutu, Linux için xdg-open denenebilir ama istek macOS içindi
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux için fallback (istenirse)
    if command -v xdg-open > /dev/null; then
        xdg-open http://localhost:3000
    fi
fi

echo "Islem tamamlandi."
