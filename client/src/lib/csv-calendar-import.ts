/**
 * CSV Calendar Import Utility
 * Supports importing calendar events from CSV files
 */

import { parseISO, isValid } from "date-fns";

export interface CSVCalendarEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  isAllDay?: boolean;
  location?: string;
  eventType?: "workout" | "meal" | "routine" | "event" | "task";
  dimensionTags?: string[];
  linkedRoute?: string;
  linkedId?: string;
  linkedType?: string;
}

export interface CSVImportResult {
  success: boolean;
  events: CSVCalendarEvent[];
  errors: string[];
  warnings: string[];
}

/**
 * Parse CSV content and convert to calendar events
 * Expected CSV format:
 * Title,Description,Start Date,Start Time,End Time,All Day,Location,Type,Dimensions,Linked Route,Linked ID,Linked Type
 */
export function parseCalendarCSV(csvContent: string): CSVImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const events: CSVCalendarEvent[] = [];
  
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    errors.push("CSV file is empty or has no data rows");
    return { success: false, events, errors, warnings };
  }
  
  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const titleIndex = header.findIndex(h => h.includes('title') || h.includes('name') || h.includes('event'));
  const descIndex = header.findIndex(h => h.includes('desc'));
  const startDateIndex = header.findIndex(h => h.includes('start') && h.includes('date'));
  const startTimeIndex = header.findIndex(h => h.includes('start') && h.includes('time'));
  const endTimeIndex = header.findIndex(h => h.includes('end'));
  const allDayIndex = header.findIndex(h => h.includes('all') && h.includes('day'));
  const locationIndex = header.findIndex(h => h.includes('location') || h.includes('place'));
  const typeIndex = header.findIndex(h => h.includes('type') || h.includes('category'));
  const dimensionsIndex = header.findIndex(h => h.includes('dimension') || h.includes('tag'));
  const linkedRouteIndex = header.findIndex(h => h.includes('route') || h.includes('link'));
  const linkedIdIndex = header.findIndex(h => h.includes('id') && h.includes('link'));
  const linkedTypeIndex = header.findIndex(h => h.includes('type') && h.includes('link'));
  
  if (titleIndex === -1) {
    errors.push("CSV must have a 'Title' column");
    return { success: false, events, errors, warnings };
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    
    try {
      const title = values[titleIndex]?.trim();
      if (!title) {
        warnings.push(`Row ${i + 1}: Missing title, skipping`);
        continue;
      }
      
      // Parse start date/time
      let startTime: Date | null = null;
      const startDateStr = values[startDateIndex]?.trim();
      const startTimeStr = values[startTimeIndex]?.trim();
      
      if (startDateStr) {
        const dateTimeStr = startTimeStr 
          ? `${startDateStr} ${startTimeStr}`
          : startDateStr;
        startTime = parseISO(dateTimeStr);
        
        if (!isValid(startTime)) {
          // Try alternative date formats
          startTime = new Date(dateTimeStr);
          if (!isValid(startTime)) {
            warnings.push(`Row ${i + 1}: Invalid date format for "${title}", using current date`);
            startTime = new Date();
          }
        }
      } else {
        warnings.push(`Row ${i + 1}: No start date for "${title}", using current date`);
        startTime = new Date();
      }
      
      // Parse end time
      let endTime: Date | undefined;
      const endTimeStr = values[endTimeIndex]?.trim();
      if (endTimeStr) {
        if (startDateStr) {
          const endDateTimeStr = `${startDateStr} ${endTimeStr}`;
          endTime = parseISO(endDateTimeStr);
          if (!isValid(endTime)) {
            endTime = new Date(endDateTimeStr);
          }
        }
      }
      
      // Parse all day flag
      const isAllDay = values[allDayIndex]?.trim().toLowerCase() === 'true' ||
                      values[allDayIndex]?.trim().toLowerCase() === 'yes' ||
                      values[allDayIndex]?.trim() === '1';
      
      // Parse event type
      const typeStr = values[typeIndex]?.trim().toLowerCase();
      let eventType: CSVCalendarEvent['eventType'] = 'event';
      if (typeStr && ['workout', 'meal', 'routine', 'task'].includes(typeStr)) {
        eventType = typeStr as CSVCalendarEvent['eventType'];
      }
      
      // Parse dimensions
      let dimensionTags: string[] | undefined;
      const dimensionsStr = values[dimensionsIndex]?.trim();
      if (dimensionsStr) {
        dimensionTags = dimensionsStr.split(/[;|]/).map(d => d.trim()).filter(Boolean);
      }
      
      const event: CSVCalendarEvent = {
        title,
        description: values[descIndex]?.trim() || undefined,
        startTime,
        endTime: isValid(endTime) ? endTime : undefined,
        isAllDay,
        location: values[locationIndex]?.trim() || undefined,
        eventType,
        dimensionTags,
        linkedRoute: values[linkedRouteIndex]?.trim() || undefined,
        linkedId: values[linkedIdIndex]?.trim() || undefined,
        linkedType: values[linkedTypeIndex]?.trim() || undefined,
      };
      
      events.push(event);
    } catch (error) {
      errors.push(`Row ${i + 1}: Error parsing event - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return {
    success: errors.length === 0,
    events,
    errors,
    warnings,
  };
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values;
}

/**
 * Generate a sample CSV template for users
 */
export function generateSampleCSV(): string {
  const header = "Title,Description,Start Date,Start Time,End Time,All Day,Location,Type,Dimensions,Linked Route,Linked ID,Linked Type";
  const sample1 = '"Morning Workout","Strength training session",2026-01-27,07:00,08:00,false,Home Gym,workout,physical,/workout,workout-123,workout';
  const sample2 = '"Team Meeting","Weekly sync with team",2026-01-27,10:00,11:00,false,Conference Room,event,occupational,,,';
  const sample3 = '"Meal Prep","Prepare lunch for the week",2026-01-27,12:00,13:00,false,Kitchen,meal,physical,/meal-prep,,';
  
  return [header, sample1, sample2, sample3].join('\n');
}

/**
 * Download sample CSV template
 */
export function downloadSampleCSV(): void {
  const csvContent = generateSampleCSV();
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'calendar-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
