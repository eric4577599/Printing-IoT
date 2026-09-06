using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PrintingIoT.API.Controllers;

/// <summary>
/// DocsController — 文件服務 API
/// 
/// 提供 /api/docs/:filename 端點，讓 DocsPortal 前端可讀取 doc/ 目錄下的 Markdown 文件。
/// Phase 3.13: 解除 DocsPortal 的 "需要後端 API 端點" 阻塞。
/// 
/// 安全性：
/// - 僅允許讀取 .md 檔案
/// - 使用 Path.GetFileName 防止目錄遍歷攻擊
/// - 限制在 doc/ 目錄範圍內
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DocsController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<DocsController> _logger;

    public DocsController(IWebHostEnvironment env, ILogger<DocsController> logger)
    {
        _env = env;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/docs — 取得文件清單
    /// </summary>
    [HttpGet]
    public ActionResult<IEnumerable<object>> ListDocuments()
    {
        var docPath = GetDocPath();
        if (!Directory.Exists(docPath))
            return Ok(Array.Empty<object>());

        var files = Directory.GetFiles(docPath, "*.md")
            .Select(f => new
            {
                name = Path.GetFileNameWithoutExtension(f),
                path = Path.GetFileName(f),
                sizeBytes = new FileInfo(f).Length,
                lastModified = System.IO.File.GetLastWriteTimeUtc(f)
            })
            .OrderBy(f => f.name);

        return Ok(files);
    }

    /// <summary>
    /// GET /api/docs/{filename} — 讀取指定文件內容
    /// </summary>
    [HttpGet("{filename}")]
    public async Task<ActionResult> GetDocument(string filename)
    {
        // Security: sanitize path, prevent directory traversal
        var safeName = Path.GetFileName(filename);
        if (string.IsNullOrEmpty(safeName) || !safeName.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Only .md files are supported.");
        }

        var filePath = Path.Combine(GetDocPath(), safeName);

        if (!System.IO.File.Exists(filePath))
        {
            _logger.LogWarning("Document not found: {Filename}", safeName);
            return NotFound($"Document '{safeName}' not found.");
        }

        var content = await System.IO.File.ReadAllTextAsync(filePath);
        return Content(content, "text/markdown; charset=utf-8");
    }

    private string GetDocPath()
    {
        // In Docker: /app/doc/
        // In Development: look relative to content root
        var docPath = Path.Combine(_env.ContentRootPath, "..", "..", "doc");
        if (!Directory.Exists(docPath))
        {
            // Fallback: try relative to working directory
            docPath = Path.Combine(Directory.GetCurrentDirectory(), "doc");
        }
        if (!Directory.Exists(docPath))
        {
            // Absolute fallback for dev
            docPath = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "doc"));
        }
        return docPath;
    }
}
