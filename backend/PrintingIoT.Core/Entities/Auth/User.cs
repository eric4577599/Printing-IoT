using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using PrintingIoT.Core.Constants;

namespace PrintingIoT.Core.Entities.Auth;

[Table("Users")]
public class User
{
    private string _username = string.Empty;

    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// 登入帳號,**保留原始大小寫**供顯示與稽核(名冊、使用者清單、日誌都看這一欄)。
    /// 輸入:任意大小寫的帳號;輸出:原樣回傳;
    /// 邏輯:setter 內同步以 <see cref="AppUsernames.Normalize"/> 寫入 <see cref="UsernameNormalized"/>,
    ///       因此 controller、seed、測試等**任何**寫入路徑都不可能忘記設定正規化值(S6 §3.3)。
    /// </summary>
    [Required]
    [MaxLength(50)]
    public required string Username
    {
        get => _username;
        set
        {
            _username = value;
            UsernameNormalized = AppUsernames.Normalize(value);
        }
    }

    /// <summary>
    /// 帳號的正規化值(大寫、去前後空白),唯一索引 IX_Users_UsernameNormalized 建於此欄。
    /// 對外唯讀(private set):值恆由 <see cref="Username"/> 的 setter 導出,不得手動指派;
    /// 絕不出現在任何 API 回應中,對外一律回原始大小寫的 <see cref="Username"/>。
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string UsernameNormalized { get; private set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public required string PasswordHash { get; set; }

    /// <summary>顯示名稱(S5 新增,可空);未設定時前端以 Username 遞補。</summary>
    [MaxLength(50)]
    public string? DisplayName { get; set; }

    /// <summary>預設班別(S5 新增,可空),例:A / B / C。</summary>
    [MaxLength(10)]
    public string? Shift { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
