using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace PrintingIoT.Core.Entities.Auth;

[Table("UserRoles")]
public class UserRole
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }
    [JsonIgnore]
    public User User { get; set; } = null!;

    [Required]
    public Guid RoleId { get; set; }
    [JsonIgnore]
    public Role Role { get; set; } = null!;
}
