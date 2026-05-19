namespace PrintingIoT.Core.DTOs.Auth;

/// <summary>
/// Auth DTOs - Authentication Data Transfer Objects
/// </summary>
public record LoginRequest(string Username, string Password);
public record LoginResponse(string Token, string Username, string[] Roles);
