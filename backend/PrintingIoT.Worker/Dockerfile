FROM mcr.microsoft.com/dotnet/runtime:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["PrintingIoT.Worker/PrintingIoT.Worker.csproj", "PrintingIoT.Worker/"]
COPY ["PrintingIoT.Core/PrintingIoT.Core.csproj", "PrintingIoT.Core/"]
COPY ["PrintingIoT.Infrastructure/PrintingIoT.Infrastructure.csproj", "PrintingIoT.Infrastructure/"]
RUN dotnet restore "PrintingIoT.Worker/PrintingIoT.Worker.csproj"
COPY . .
WORKDIR "/src/PrintingIoT.Worker"
RUN dotnet build "PrintingIoT.Worker.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "PrintingIoT.Worker.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PrintingIoT.Worker.dll"]
