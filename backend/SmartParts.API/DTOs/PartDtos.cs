namespace SmartParts.API.DTOs;

public record CreatePartDto(
    string InternalPN, 
    string Name, 
    string Unit, 
    string? Specification, 
    string? Category, 
    int SafeStockLevel,
    List<CreateSupplierPartDto>? Suppliers
);

public record CreateSupplierPartDto(
    string SupplierName, // Simplified: pass name, find or create supplier
    string ManufacturerPN,
    decimal? Price,
    bool IsPreferred
);

public record PartDto(
    Guid Id,
    string InternalPN,
    string Name,
    string Specification,
    int SafeStockLevel,
    List<SupplierPartDto> Suppliers
);

public record SupplierPartDto(
    Guid SupplierId,
    string SupplierName,
    string ManufacturerPN,
    bool IsPreferred
);
