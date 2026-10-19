# Wooden Work - Material Manager
# Handles applying and managing materials on components

module WoodenWork
  module Materials
    class MaterialManager
      def self.apply_to_group(group, material_name)
        model = Sketchup.active_model
        texture = WoodTextures.get_texture(material_name)
        return unless texture

        mat = model.materials[texture[:name]]
        unless mat
          mat = model.materials.add(texture[:name])
          mat.color = Sketchup::Color.new(*texture[:color])
        end

        apply_material_recursive(group, mat)
      end

      def self.apply_to_selection
        model = Sketchup.active_model
        selection = model.selection

        if selection.empty?
          UI.messagebox('Please select a component first.')
          return
        end

        model.start_operation('Apply Material', true)

        selection.each do |entity|
          if entity.is_a?(Sketchup::Group) || entity.is_a?(Sketchup::ComponentInstance)
            apply_material_recursive(entity, get_current_material)
          end
        end

        model.commit_operation
      end

      def self.apply_with_options(group, material_name, options = {})
        model = Sketchup.active_model
        texture = WoodTextures.get_texture(material_name)
        return unless texture

        mat = model.materials[texture[:name]]
        unless mat
          mat = model.materials.add(texture[:name])
          mat.color = Sketchup::Color.new(*texture[:color])
        end

        if options[:finish]
          finish = WoodTextures::FINISHES[options[:finish].to_sym]
          if finish
            mat.properties['Specular'] = finish[:specular] / 100.0
            mat.properties['Glossiness'] = finish[:glossiness] / 100.0
          end
        end

        if options[:opacity]
          mat.alpha = options[:opacity] / 100.0
        end

        apply_material_recursive(group, mat)
      end

      def self.reset_material
        model = Sketchup.active_model
        selection = model.selection

        return if selection.empty?

        model.start_operation('Reset Material', true)

        selection.each do |entity|
          if entity.is_a?(Sketchup::Group) || entity.is_a?(Sketchup::ComponentInstance)
            reset_material_recursive(entity)
          end
        end

        model.commit_operation
      end

      def self.get_current_material
        model = Sketchup.active_model
        model.materials['Oak Wood'] || model.materials.add('Oak Wood')
      end

      class << self
        private

        def apply_material_recursive(entity, material)
          entity.material = material

          if entity.is_a?(Sketchup::Group)
            entity.entities.each do |child|
              apply_material_recursive(child, material) if child.respond_to?(:material=)
            end
          end
        end

        def reset_material_recursive(entity)
          entity.material = nil

          if entity.is_a?(Sketchup::Group)
            entity.entities.each do |child|
              reset_material_recursive(child) if child.respond_to?(:material=)
            end
          end
        end
      end
    end
  end
end
