using System;
using System.Collections.Generic;

namespace OpsDeck.Desktop
{
    public enum TaskStatus
    {
        Urgent,
        InProgress,
        Blocked,
        Completed
    }

    public enum TaskPriority
    {
        Critical,
        High,
        Medium,
        Low
    }

    public class DeckTile
    {
        public string Id { get; set; }
        public string Label { get; set; }
        public string SubLabel { get; set; }
        public string IconGlyph { get; set; }
        public string AccentColor { get; set; } // Hex: e.g. "#22D3EE"
        public string Command { get; set; }     // e.g. "hotkey:Ctrl+Shift+M", "launch:excel", "macro:sum"
        public string Shortcut { get; set; }
        public bool IsActive { get; set; }

        public DeckTile() { }

        public DeckTile(string id, string label, string subLabel, string glyph, string color, string cmd, string shortcut = "")
        {
            Id = id;
            Label = label;
            SubLabel = subLabel;
            IconGlyph = glyph;
            AccentColor = color;
            Command = cmd;
            Shortcut = shortcut;
            IsActive = false;
        }
    }

    public class KanbanTask
    {
        public string Id { get; set; }
        public string Code { get; set; }
        public string Title { get; set; }
        public string Project { get; set; }
        public TaskPriority Priority { get; set; }
        public TaskStatus Status { get; set; }
        public string DueTime { get; set; }
        public int EstimatedMinutes { get; set; }
        public string Assignee { get; set; }
        public string SourceBadge { get; set; }
        public string PcTriggerApp { get; set; }

        public KanbanTask() { }

        public KanbanTask(string code, string title, string project, TaskPriority priority, TaskStatus status, string dueTime, string badge, string pcApp = "Excel")
        {
            Id = Guid.NewGuid().ToString("N").Substring(0, 8);
            Code = code;
            Title = title;
            Project = project;
            Priority = priority;
            Status = status;
            DueTime = dueTime;
            EstimatedMinutes = 30;
            Assignee = "Tú (Dirección)";
            SourceBadge = badge;
            PcTriggerApp = pcApp;
        }
    }

    public class TriageIncomingItem
    {
        public string Id { get; set; }
        public string ExternalId { get; set; }
        public string SourcePlatform { get; set; }
        public string Sender { get; set; }
        public string Subject { get; set; }
        public string Snippet { get; set; }
        public bool IsActionable { get; set; }
        public int AiConfidence { get; set; }
        public string AiReasoning { get; set; }
        public int SlaMinutes { get; set; }
        public TaskPriority SuggestedPriority { get; set; }
        public TaskStatus SuggestedStatus { get; set; }
        public bool ProcessedIntoKanban { get; set; }
    }
}
