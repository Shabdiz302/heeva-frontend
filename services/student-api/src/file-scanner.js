import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

// Fail closed: no scanner configuration means no teacher CV uploads.
export async function scanTeacherPdf(path) {
  const executable = process.env.HEEVA_CLAMSCAN_PATH || "";
  if (!executable.startsWith("/") || executable.includes("\0")) {
    return { clean:false, reason:"unavailable" };
  }
  try {
    await execFileAsync(executable, ["--no-summary", "--", path], {
      timeout:30000,maxBuffer:1024*1024,windowsHide:true,
    });
    return { clean:true };
  } catch (error) {
    return { clean:false, reason:error.code===1?"infected":"unavailable" };
  }
}
