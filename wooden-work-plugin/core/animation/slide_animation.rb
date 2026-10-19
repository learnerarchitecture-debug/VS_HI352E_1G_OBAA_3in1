# Wooden Work - Slide Animation
# Handles sliding door and drawer animations

module WoodenWork
  module Animation
    class SlideAnimation
      def self.animate(entity, params = {})
        model = Sketchup.active_model
        duration = (params[:duration] || 1000).to_f / 1000.0
        distance = (params[:max] || 600).to_f / 1000.0
        direction = params[:direction] || 'open'
        easing = params[:easing] || 'ease-in-out'
        speed = (params[:speed] || 1.0).to_f

        if direction == 'toggle'
          distance = -distance
        elsif direction == 'close'
          distance = -distance
        end

        original_transform = entity.transformation
        start_time = Time.now

        anim_thread = Thread.new do
          loop do
            elapsed = (Time.now - start_time) * speed
            progress = [elapsed / duration, 1.0].min

            eased_progress = apply_easing(progress, easing)
            offset = distance * eased_progress

            transform = Geom::Transformation.new([offset, 0, 0])
            entity.transformation = original_transform * transform

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
          UI.messagebox('Please select a sliding door or drawer to animate.')
          return
        end

        selection.each do |entity|
          if entity.is_a?(Sketchup::Group)
            animate(entity, {
              duration: 1000,
              max: 600,
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
