# Build stage
FROM maven:3.9.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

# Copy JAR from build stage
COPY --from=builder /app/target/gallery-service-*.jar app.jar

# Expose port
EXPOSE 8081

# Run the application
CMD ["java", "-jar", "app.jar"] 