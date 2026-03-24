# Ransight Docker Setup Guide

Bu proje, Ransight platformunun tüm servislerini tek bir Docker Compose yapisi altinda toplar.

## Gereksinimler

- **Docker Desktop**: Bilgisayarinizda Docker'in yuklu ve calisir durumda olmasi gerekir.

## Nasil Calistirilir (Tek Tusla)

Proje kok dizininde bulunan `start.bat` dosyasina cift tiklayarak tum sistemi ayaga kaldirabilirsiniz.

### `start.bat` Ne Yapar?
1. **Docker Kontrolu**: Docker'in calisip calismadigini kontrol eder.
2. **Insa ve Baslatma**: Tum servisleri (`docker-compose up --build`) insa eder ve baslatir.
3. **Saglik Kontrolu**: PostgreSQL veritabaninin hazir olmasini bekler.
4. **Veri Yukleme (Opsiyonel)**: Eger ayni dizinde `current_db_backup.sql` adinda bir dosya varsa, bunu veritabanina yukler. Yoksa bos bir veritabani ile devam eder.
5. **Tarayici**: Dashboard uygulamasini varsayilan tarayicinizda acar (`http://localhost:3000`).

## Servisler ve Portlar

Sistem basariyla calistiginda asagidaki adreslerden erisilebilir:

| Servis | URL | Aciklama |
|--------|-----|----------|
| **Frontend** | `http://localhost:3000` | Ana kullanici arayuzu (Dashboard) |
| **Auth Service** | `http://localhost:8000` | Kimlik dogrulama servisi |
| **Device Service** | `http://localhost:8080` | Cihaz yonetim servisi |
| **Gallery Service** | `http://localhost:8081` | Galeri yonetim servisi |
| **Person Service** | `http://localhost:8082` | Personel yonetim servisi |
| **Mine Dashboard API** | `http://localhost:8001` | Maden izleme backend servisi |
| **InfluxDB** | `http://localhost:8086` | Zaman serisi veritabani |
| **Mosquitto (MQTT)** | `localhost:1883` | Mesajlasma sunucusu |

## Sorun Giderme

- **Docker hatasi alirsaniz**: Docker Desktop'in acik oldugundan emin olun.
- **Port hatasi alirsaniz**: Baska bir uygulamanin yukaridaki portlari (ozellikle 3000, 5432, 8080) kullanmadigindan emin olun.
- **Veritabani hatasi**: `docker-compose down -v` komutu ile tum verileri temizleyip tekrar baslatmayi deneyebilirsiniz.

## Veritabani Yedegi Yukleme

Eger elinizde bir veritabani yedegi (`.sql`) varsa:
1. Dosyanin adini `current_db_backup.sql` olarak degistirin.
2. Bu dosyayi `start.bat` ile ayni dizine kopyalayin.
3. `start.bat` dosyasini calistirin (veya hali hazirda calisiyorsa kapatin ve tekrar acin).

## Linux / Mac Kullanicilari

Linux veya Mac kullaniyorsaniz `start.sh` scriptini kullanabilirsiniz:
```bash
chmod +x start.sh
./start.sh
```

