# Wooden Work Toolbar

module WoodenWork
  class Toolbar
    def initialize
      create_toolbar
    end

    def create_toolbar
      @toolbar = UI::Toolbar.new(PLUGIN_NAME)

      add_cmd('Wardrobe', 'wardrobe', 'Wardrobe Designer')
      add_cmd('Drawer', 'drawer', 'Drawer Designer')
      add_cmd('Shelf', 'shelf', 'Shelf Designer')
      add_cmd('Door', 'door', 'Door Designer')
      @toolbar.add_separator
      add_cmd('Materials', 'material', 'Material Library')
      add_cmd('Animate', 'animate', 'Animation Studio')
      @toolbar.add_separator
      add_cmd('Cutlist', 'cutlist', 'Cutlist Generator')
      add_cmd('Cost', 'cost', 'Cost Calculator')
      add_cmd('Templates', 'templates', 'Design Templates')
      add_cmd('Export', 'export', 'Export Design')
      @toolbar.add_separator
      add_cmd('Help', 'help', 'Help')

      @toolbar.show
    end

    private

    def add_cmd(label, icon, tooltip)
      cmd = UI::Command.new(label) { run(icon) }
      cmd.tooltip = tooltip
      cmd.status_bar_text = tooltip
      path = File.join(File.dirname(__FILE__), '..', 'icons', "#{icon}.svg")
      if File.exist?(path)
        cmd.large_icon = path
        cmd.small_icon = path
      end
      @toolbar.add_item(cmd)
    end

    def run(cmd)
      case cmd
      when 'wardrobe', 'drawer', 'shelf', 'door', 'material', 'animate', 'cutlist', 'cost', 'templates', 'export'
        UIDialogs::MainDialog.instance.show_tab(cmd)
      when 'material'
        Materials::MaterialManager.apply_to_selection
      when 'help'
        show_help
      end
    end

    def show_help
      UI.messagebox("Archinsights Wooden Work Studio v#{PLUGIN_VERSION}\n\nAuthor: Archinsights")
    end
  end

  Toolbar.new
end
