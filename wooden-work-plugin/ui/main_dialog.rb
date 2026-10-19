# Wooden Work - Main Dialog Controller
# Manages the main HTML dialog and bridges Ruby-JS communication

module WoodenWork
  module UIDialogs
    class MainDialog
      @@dialog = nil
      @@instance = nil

      def self.instance
        @@instance ||= new
      end

      def show
        create_dialog
        @@dialog.show
      end

      def show_tab(tab)
        create_dialog unless @@dialog
        @@dialog.show
        @@dialog.execute_script("switchTab('#{tab}')")
      end

      private

      def create_dialog
        return if @@dialog

        @@dialog = UI::HtmlDialog.new(
          title: 'Archinsights - Wooden Work Studio',
          width: 1000,
          height: 700,
          resizable: true,
          preferences_key: 'archinsights_wooden_work'
        )

        register_callbacks
        @@dialog.set_file(main_html_path)
      end

      def main_html_path
        File.join(File.dirname(__FILE__), '..', 'assets', 'ui', 'index.html')
      end

      def register_callbacks
        @@dialog.add_action_callback('create_wardrobe') do |params|
          begin
            Components::Wardrobe.new.create(parse_params(params))
            UI.toast('Wardrobe created successfully!')
          rescue => e
            UI.messagebox("Error creating wardrobe: #{e.message}")
          end
        end

        @@dialog.add_action_callback('create_drawer') do |params|
          begin
            Components::Drawer.new.create(parse_params(params))
            UI.toast('Drawer unit created successfully!')
          rescue => e
            UI.messagebox("Error creating drawer: #{e.message}")
          end
        end

        @@dialog.add_action_callback('create_shelf') do |params|
          begin
            Components::Shelf.new.create(parse_params(params))
            UI.toast('Shelf unit created successfully!')
          rescue => e
            UI.messagebox("Error creating shelf: #{e.message}")
          end
        end

        @@dialog.add_action_callback('create_door') do |params|
          begin
            Components::Door.new.create(parse_params(params))
            UI.toast('Door created successfully!')
          rescue => e
            UI.messagebox("Error creating door: #{e.message}")
          end
        end

        @@dialog.add_action_callback('apply_material') do |params|
          Materials::MaterialManager.apply_to_selection
          UI.toast('Material applied!')
        end

        @@dialog.add_action_callback('reset_material') do
          Materials::MaterialManager.reset_material
          UI.toast('Material reset!')
        end

        @@dialog.add_action_callback('animate_selected') do |params|
          animate_entities(parse_params(params))
        end

        @@dialog.add_action_callback('preview_animation') do |params|
          animate_entities(parse_params(params))
        end

        @@dialog.add_action_callback('stop_animation') do
          UI.toast('Animation stopped')
        end

        @@dialog.add_action_callback('add_hardware') do |params|
          Components::Frame.add_hardware_to_selection
          UI.toast('Hardware added!')
        end

        @@dialog.add_action_callback('auto_place_hardware') do
          Components::Frame.add_hardware_to_selection
          UI.toast('Hardware auto-placed!')
        end

        @@dialog.add_action_callback('remove_hardware') do
          UI.toast('Hardware removed!')
        end

        @@dialog.add_action_callback('generate_cutlist') do
          Utils::Dimensions.generate_cutlist
        end

        @@dialog.add_action_callback('export_cutlist_csv') do
          Materials::MaterialExporter.export_cutlist_csv
        end

        @@dialog.add_action_callback('calculate_cost') do
          Utils::Dimensions.cost_calculator
        end

        @@dialog.add_action_callback('load_template') do |template_id|
          Templates::TemplateLibrary.load(template_id)
        end

        @@dialog.add_action_callback('save_as_template') do
          Templates::TemplateLibrary.save_current
        end

        @@dialog.add_action_callback('export_skp') do
          export_as('skp')
        end

        @@dialog.add_action_callback('export_dxf') do
          export_as('dxf')
        end

        @@dialog.add_action_callback('export_stl') do
          export_as('stl')
        end

        @@dialog.add_action_callback('export_obj') do
          export_as('obj')
        end

        @@dialog.add_action_callback('export_image') do
          export_image
        end

        @@dialog.add_action_callback('preview_wardrobe') do |params|
          Components::Wardrobe.new.create(parse_params(params))
        end

        @@dialog.add_action_callback('preview_drawer') do |params|
          Components::Drawer.new.create(parse_params(params))
        end

        @@dialog.add_action_callback('preview_shelf') do |params|
          Components::Shelf.new.create(parse_params(params))
        end

        @@dialog.add_action_callback('preview_door') do |params|
          Components::Door.new.create(parse_params(params))
        end
      end

      def animate_entities(params)
        model = Sketchup.active_model
        selection = model.selection

        if selection.empty?
          UI.messagebox('Please select a component to animate.')
          return
        end

        selection.each do |entity|
          if entity.is_a?(Sketchup::Group)
            case params['type']
            when 'swing', 'bifold'
              Animation::SwingAnimation.animate(entity, symbolize_keys(params))
            when 'slide', 'drawer', 'stack'
              Animation::SlideAnimation.animate(entity, symbolize_keys(params))
            end
          end
        end
      end

      def export_as(format)
        model = Sketchup.active_model
        ext = format.downcase
        path = UI.savepanel("Export as #{ext.upcase}", '', "design.#{ext}")
        return unless path

        options = { 'Format' => ext.upcase }
        model.export(path, options)
        UI.messagebox("Design exported to:\n#{path}")
      end

      def export_image
        model = Sketchup.active_model
        path = UI.savepanel('Export Image', '', 'design.png')
        return unless path

        view = model.active_view
        view.write_image(path, 1920, 1080, true, true)
        UI.messagebox("Image exported to:\n#{path}")
      end

      def parse_params(params)
        return {} unless params.is_a?(Hash)
        symbolize_keys(params)
      end

      def symbolize_keys(hash)
        return hash unless hash.is_a?(Hash)
        hash.each_with_object({}) { |(k, v), h| h[k.to_sym] = v }
      end
    end
  end
end
