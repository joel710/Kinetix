/**
 * Optimized SVG Path Parser
 * Uses a manual scanner for maximum performance and minimal memory allocation.
 */

export type PathCommand = {
  code: string;
  params: number[];
};

export class PathParser {
  private static readonly COMMAND_CHARS = new Set('mlhvcsqtazMLHVCSQTAZ');

  /**
   * Parses an SVG path string into a command list.
   * Optimized to avoid heavy regex and excessive string splitting.
   */
  public static parse(d: string): PathCommand[] {
    const commands: PathCommand[] = [];
    let i = 0;
    const len = d.length;

    while (i < len) {
      // Skip whitespace and commas
      while (i < len && (d[i] === ' ' || d[i] === ',' || d[i] === '\n' || d[i] === '\r' || d[i] === '\t')) {
        i++;
      }

      if (i >= len) break;

      const char = d[i];
      if (this.COMMAND_CHARS.has(char)) {
        i++;
        const params: number[] = [];
        
        // Parse parameters until next command or end of string
        while (i < len) {
          // Skip whitespace/commas between params
          while (i < len && (d[i] === ' ' || d[i] === ',' || d[i] === '\n' || d[i] === '\r' || d[i] === '\t')) {
            i++;
          }
          
          if (i >= len || this.COMMAND_CHARS.has(d[i])) break;

          // Extract number
          let start = i;
          // Handle signs and decimals
          if (d[i] === '-' || d[i] === '+') i++;
          let hasDot = false;
          while (i < len && ((d[i] >= '0' && d[i] <= '9') || (!hasDot && d[i] === '.'))) {
            if (d[i] === '.') hasDot = true;
            i++;
          }
          
          if (start !== i) {
            params.push(parseFloat(d.substring(start, i)));
          } else {
            // Safety break for invalid characters
            i++;
          }
        }
        
        commands.push({ code: char, params });
      } else {
        i++; // Skip invalid chars
      }
    }
    
    return commands;
  }
}
