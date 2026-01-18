FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["PrintingIoT.API/PrintingIoT.API.csproj", "PrintingIoT.API/"]
COPY ["PrintingIoT.Core/PrintingIoT.Core.csproj", "PrintingIoT.Core/"]
COPY ["PrintingIoT.Infrastructure/PrintingIoT.Infrastructure.csproj", "PrintingIoT.Infrastructure/"]
COPY ["PrintingIoT.Worker/PrintingIoT.Worker.csproj", "PrintingIoT.Worker/"]
RUN dotnet restore "PrintingIoT.API/PrintingIoT.API.csproj"
COPY . .
WORKDIR "/src/PrintingIoT.API"
RUN dotnet build "PrintingIoT.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "PrintingIoT.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PrintingIoT.API.dll"]
