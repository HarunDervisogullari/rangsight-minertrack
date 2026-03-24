from django.db import models

class User(models.Model):
    """
    Corresponds to the 'users' table.
    """
    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=150, unique=True)
    email = models.CharField(max_length=254, unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'
        # managed = False  # REMOVE THIS LINE to let Django manage the table creation


    def __str__(self):
        return self.username


class Person(models.Model):
    """
    Corresponds to the 'persons' table.
    """
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, null=True, blank=True)
    surname = models.CharField(max_length=100, null=True, blank=True)
    position = models.CharField(max_length=100, null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    contact = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=100, null=True, blank=True)
    location = models.CharField(max_length=100, null=True, blank=True)
    level = models.FloatField(null=True, blank=True)
    supervisor = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'persons'
        # managed = False

    def __str__(self):
        return f"{self.name or ''} {self.surname or ''}".strip()


class UserPerson(models.Model):
    """
    Corresponds to the 'user_person' table linking a User and a Person.
    
    Since the table uses a composite primary key and does not have an 'id' column,
    and assuming each user has exactly one linked Person record,
    we mark the 'user' field as primary_key. This tells Django not to expect an 'id' field.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id', primary_key=True)
    person = models.ForeignKey(Person, on_delete=models.CASCADE, db_column='person_id', null=True, blank=True)

    class Meta:
        db_table = 'user_person'
        # managed = False  # REMOVE THIS LINE to let Django manage the table creation


    def __str__(self):
        return f"{self.user.username} ↔ {self.person.name or ''} {self.person.surname or ''}"
