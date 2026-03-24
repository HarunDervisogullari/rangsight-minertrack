#!/bin/sh

# Veritabanının hazır olmasını bekle
echo "Waiting for postgres..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done
echo "PostgreSQL started"

# Migration klasörünü temizle (temiz başlangıç için)
echo "Cleaning migration history in container..."
rm -f /app/auth_service/migrations/0*.py
rm -f /app/auth_service/migrations/__init__.py
touch /app/auth_service/migrations/__init__.py

# Migration oluştur
echo "Making migrations..."
python manage.py makemigrations auth_service

# Eğer veritabanında auth_service_user tablosu varsa ama users tablosu yoksa,
# bu tabloyu users olarak yeniden adlandır. Bu, temiz kurulum sonrası oluşan
# isimlendirme sorununu çözer.
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt auth_service_user" | grep -q "auth_service_user"; then
    echo "Found old table name 'auth_service_user', renaming to 'users'..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "ALTER TABLE auth_service_user RENAME TO users;"
fi

# Migrationları fake olarak işaretlemeyi dene (zaten varsa hata vermez, yoksa işaretler)
# Bu, özellikle 0001 ve 0002 çakışmalarını önlemek için.
python manage.py migrate --fake-initial

# Kalan migrationları normal şekilde uygula
python manage.py migrate

# Seed Data (Test Kullanıcısı ve Simülasyon Verileri)
echo "Checking/Seeding initial data..."

# Diğer servislerin tablolarını oluşturmasını bekle
echo "Waiting for external tables (galleries, devices, person_device) to be ready..."
until PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt galleries" | grep -q "galleries"; do
  echo "Waiting for galleries table..."
  sleep 2
done

until PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt devices" | grep -q "devices"; do
  echo "Waiting for devices table..."
  sleep 2
done

until PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\dt person_device" | grep -q "person_device"; do
  echo "Waiting for person_device table..."
  sleep 2
done

# Her başlangıçta seed verilerini çalıştır (Idempotent: ON CONFLICT kullanılıyor)
# Bu sayede güncellemeler (örn: zone-8 değişimi) her restartta uygulanır.
echo "Seeding/Updating initial data..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f /app/seed_data.sql

# Statik dosyaları topla
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Uygulamayı başlat
echo "Starting application..."
exec "$@"
