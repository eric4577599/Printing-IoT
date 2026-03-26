FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["backend/MMS.API/MMS.API.csproj", "backend/MMS.API/"]
COPY ["backend/MMS.Core/MMS.Core.csproj", "backend/MMS.Core/"]
COPY ["backend/MMS.Infrastructure/MMS.Infrastructure.csproj", "backend/MMS.Infrastructure/"]
RUN dotnet restore "backend/MMS.API/MMS.API.csproj"
COPY . .
WORKDIR "/src/backend/MMS.API"
RUN dotnet build "MMS.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MMS.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MMS.API.dll"]
