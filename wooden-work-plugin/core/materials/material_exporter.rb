# Wooden Work - Material Exporter
# Exports material information and design data

require 'json'
require 'csv'

module WoodenWork
  module Materials
    class MaterialExporter
      def self.export_design
        model = Sketchup.active_model
        path = UI.savepanel('Export Design', '', 'wooden_work_design.json')

        return unless path

        data = {
          version: '1.0.0',
          timestamp: Time.now.to_s,
          components: [],
          materials: []
        }

        model.active_entities.each do |entity|
          if entity.is_a?(Sketchup::Group)
            data[:components] << export_component(entity)
          end
        end

        model.materials.each do |mat|
          data[:materials] << {
            name: mat.name,
            color: [mat.color.red, mat.color.green, mat.color.blue],
            alpha: mat.alpha
          }
        end

        File.write(path, JSON.pretty_generate(data))
        UI.messagebox("Design exported to:\n#{path}")
      end

      def self.export_cutlist_csv
        path = UI.savepanel('Export Cutlist', '', 'cutlist.csv')
        return unless path

        cutlist = generate_cutlist_data

        CSV.open(path, 'w') do |csv|
          csv << ['Part Name', 'Quantity', 'Width (mm)', 'Height (mm)', 'Thickness (mm)', 'Material', 'Grain']
          cutlist.each { |row| csv << row }
        end

        UI.messagebox("Cutlist exported to:\n#{path}")
      end

      def self.export_cutlist_pdf
        UI.messagebox('PDF export requires a PDF library. Use CSV export instead.')
      end

      private

      def self.export_component(entity)
        {
          name: entity.name,
          bounds: {
            width: entity.bounds.width * 1000,
            height: entity.bounds.height * 1000,
            depth: entity.bounds.depth * 1000
          },
          material: entity.material&.name || 'None'
        }
      end

      def self.generate_cutlist_data
        model = Sketchup.active_model
        cutlist = []

        model.active_entities.each do |entity|
          if entity.is_a?(Sketchup::Group) && entity.name.include?('Wardrobe')
            cutlist << [entity.name, 1, entity.bounds.width * 1000, entity.bounds.height * 1000, 18, 'Wood', 'Vertical']
          end
        end

        cutlist
      end
    end
  end
end
