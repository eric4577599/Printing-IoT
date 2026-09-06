using Microsoft.AspNetCore.Authorization;
using PrintingIoT.Core.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrintingIoT.Core.Entities;
using PrintingIoT.Core.Interfaces;

namespace PrintingIoT.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetProducts()
    {
        var products = await _productService.GetProductsAsync();
        return Ok(products);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetProduct(Guid id)
    {
        var product = await _productService.GetProductAsync(id);
        if (product == null) return NotFound();
        return Ok(product);
    }

    [Authorize(Policy = AppRoles.Policies.MasterDataWrite)]
    [HttpPost]
    public async Task<ActionResult<Product>> CreateProduct(Product product)
    {
        var createdProduct = await _productService.CreateProductAsync(product);
        return CreatedAtAction(nameof(GetProduct), new { id = createdProduct.Id }, createdProduct);
    }

    [Authorize(Policy = AppRoles.Policies.MasterDataWrite)]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProduct(Guid id, Product product)
    {
        var success = await _productService.UpdateProductAsync(id, product);
        if (!success) return BadRequest();
        return NoContent();
    }

    [Authorize(Policy = AppRoles.Policies.MasterDataWrite)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        var success = await _productService.DeleteProductAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
