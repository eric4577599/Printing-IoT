using PrintingIoT.Core.Entities;

namespace PrintingIoT.Core.Interfaces;

public interface IProductService
{
    Task<IEnumerable<Product>> GetProductsAsync();
    Task<Product?> GetProductAsync(Guid id);
    Task<Product> CreateProductAsync(Product product);
    Task<bool> UpdateProductAsync(Guid id, Product product);
    Task<bool> DeleteProductAsync(Guid id);
    Task<bool> ProductExistsAsync(Guid id);
}
