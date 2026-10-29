package com.opsdeck.mobile;

public class Models {
    public static class DeckTile {
        public String id;
        public String label;
        public String subLabel;
        public String glyph;
        public String color;
        public String command;
        public String shortcut;

        public DeckTile(String id, String label, String subLabel, String glyph, String color, String command, String shortcut) {
            this.id = id;
            this.label = label;
            this.subLabel = subLabel;
            this.glyph = glyph;
            this.color = color;
            this.command = command;
            this.shortcut = shortcut;
        }
    }

    public static class KanbanCard {
        public String id;
        public String code;
        public String title;
        public String project;
        public String priority;
        public String status;
        public String dueTime;
        public String badge;

        public KanbanCard(String id, String code, String title, String project, String priority, String status, String dueTime, String badge) {
            this.id = id;
            this.code = code;
            this.title = title;
            this.project = project;
            this.priority = priority;
            this.status = status;
            this.dueTime = dueTime;
            this.badge = badge;
        }
    }
}
