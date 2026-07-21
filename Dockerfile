# ==========================================
# Stage 1: Build the application
# ==========================================
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copy the pom.xml file and the source code
COPY pom.xml .
COPY src ./src
COPY frontend ./frontend

# Package the application (this also builds the frontend via frontend-maven-plugin)
# -DskipTests is used to speed up the build on Render
RUN mvn clean package -DskipTests

# ==========================================
# Stage 2: Run the application
# ==========================================
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app

# Copy the jar file built in the first stage
COPY --from=build /app/target/piggyback-1.0.0.jar app.jar

# Expose port 8080
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
