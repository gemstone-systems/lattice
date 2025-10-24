/**
 * Checks if a string is a domain
 * does NOT do TLD-level checks. Any domain/NSID-like string will pass this check
 */
export const isDomain = (str: string) => {
    try {
        const url = new URL(str.includes("://") ? str : `https://${str}`);
        return (
            (url.hostname.includes(".") && !url.hostname.startsWith(".")) ||
            url.hostname === "localhost"
        );
    } catch {
        return false;
    }
};
