# Wooden Work - Swing Animation
# Handles hinged door swing animations

module WoodenWork
  module Animation
    class SwingAnimation
      def self.animate(entity, params = {})
        model = Sketchup.active_model
        duration = (params[:duration] || 1000).to_f / 1000.0
        max_angle = (params[:max] || 90).to_f
        direction = params[:direction] || 'open'
        easing = params[:easing] || 'ease-in-out'
        speed = (params[:speed] || 1.0).to_f

        max_angle_rad = max_angle * Math::PI / 180.0

        if direction == 'toggle' || direction == 'close'
          max_angle_rad = -max_angle_rad
        end

        bounds = entity.bounds
        pivot_point = Geom::Point3d.new(bounds.min.x, bounds.min.y + bounds.depth / 2.0, bounds.min.z)
        z_axis = Geom::Vector3d.new(0, 1, 0)

        original_transformation = entity.transformation
        start_time = Time.now

        anim_thread = Thread.new do
          loop do
            elapsed = (Time.now - start_time) * speed
            progress = [elapsed / duration, 1.0].min

            eased_progress = apply_easing(progress, easing)
            angle = max_angle_rad * eased_progress

            rotation = Geom::Transformation.rotation(pivot_point, z_axis, angle)
            entity.transformation = original_transformation * rotation

            break if progress >= 1.0

            sleep 0.016
          end
        end

        anim_thread
      end

      def self.preview_current
        model = Sketchup.active_model
        selection = model.selection

        if selection.empty?
          UI.messagebox('Please select a hinged door to animate.')
          return
        end

        selection.each do |entity|
          if entity.is_a?(Sketchup::Group)
            animate(entity, {
              duration: 1000,
              max: 90,
              direction: 'open',
              easing: 'ease-in-out',
              speed: 1.0
            })
          end
        end
      end

      private

      def self.apply_easing(t, type)
        case type
        when 'ease-in'
          t * t
        when 'ease-out'
          1 - (1 - t) * (1 - t)
        when 'ease-in-out'
          t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
        when 'linear'
          t
        when 'bounce'
          bounce_ease(t)
        when 'elastic'
          elastic_ease(t)
        else
          t
        end
      end

      def self.bounce_ease(t)
        if t < 1.0 / 2.75
          7.5625 * t * t
        elsif t < 2.0 / 2.75
          t -= 1.5 / 2.75
          7.5625 * t * t + 0.75
        elsif t < 2.5 / 2.75
          t -= 2.25 / 2.75
          7.5625 * t * t + 0.9375
        else
          t -= 2.625 / 2.75
          7.5625 * t * t + 0.984375
        end
      end

      def self.elastic_ease(t)
        return 0 if t == 0
        return 1 if t == 1

        p = 0.3
        s = p / 4

        (2 ** (-10 * t) * Math.sin((t - s) * (2 * Math::PI) / p) + 1)
      end
    end
  end
end
