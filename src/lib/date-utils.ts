/**
 * Formats a date string or Date object into a stable format using UTC.
 * This prevents hydration mismatches by ensuring the same string is rendered
 * on both server and client regardless of local timezone.
 */
export function formatUTC(
  date: string | Date | null | undefined,
  formatType: "short" | "long" | "full" = "short"
): string {
  if (!date) return "—";
  
  const d = new Date(date);
  
  // Check for invalid date
  if (isNaN(d.getTime())) return "—";

  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  if (formatType === "full") {
    return `${fullMonths[month]} ${day}, ${year}`;
  }
  
  if (formatType === "long") {
    return `${shortMonths[month]} ${day}, ${year}`;
  }
  
  return `${month + 1}/${day}/${year}`;
}

/**
 * Formats a date string or Date object into a stable M/d/yyyy, h:mm AM/PM (UTC) format.
 */
export function formatDateTimeUTC(
  date: string | Date | null | undefined
): string {
  if (!date) return "—";
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return "—";

  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  
  return `${month}/${day}/${year}, ${hours12}:${minutes} ${ampm} (UTC)`;
}
