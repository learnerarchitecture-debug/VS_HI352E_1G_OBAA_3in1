# Wooden Work - Keyframe Animation
# Handles keyframe-based animation sequences

module WoodenWork
  module Animation
    class Keyframe
      attr_accessor :time, :position, :rotation, :scale

      def initialize(time, position = nil, rotation = nil, scale = nil)
        @time = time
        @position = position || [0, 0, 0]
        @rotation = rotation || [0, 0, 0]
        @scale = scale || [1, 1, 1]
      end

      def self.interpolate(key1, key2, t)
        pos = key1.position.zip(key2.position).map { |a, b| a + (b - a) * t }
        rot = key1.rotation.zip(key2.rotation).map { |a, b| a + (b - a) * t }
        scl = key1.scale.zip(key2.scale).map { |a, b| a + (b - a) * t }

        new(
          key1.time + (key2.time - key1.time) * t,
          pos,
          rot,
          scl
        )
      end
    end

    class KeyframeAnimator
      def initialize
        @keyframes = []
      end

      def add_keyframe(time, position = nil, rotation = nil, scale = nil)
        @keyframes << Keyframe.new(time, position, rotation, scale)
        @keyframes.sort_by!(&:time)
      end

      def animate(entity, duration_ms, easing = 'linear')
        return if @keyframes.empty?

        duration = duration_ms.to_f / 1000.0
        original_transform = entity.transformation
        start_time = Time.now

        anim_thread = Thread.new do
          loop do
            elapsed = (Time.now - start_time)
            progress = [elapsed / duration, 1.0].min

            eased_progress = apply_easing(progress, easing)

            keyframe = get_keyframe_at(eased_progress)
            next unless keyframe

            transform = Geom::Transformation.new(keyframe.position)
            rotation_x = Geom::Transformation.rotation([0, 0, 0], [1, 0, 0], keyframe.rotation[0])
            rotation_y = Geom::Transformation.rotation([0, 0, 0], [0, 1, 0], keyframe.rotation[1])
            rotation_z = Geom::Transformation.rotation([0, 0, 0], [0, 0, 1], keyframe.rotation[2])

            entity.transformation = original_transform * transform * rotation_x * rotation_y * rotation_z

            break if progress >= 1.0

            sleep 0.016
          end
        end

        anim_thread
      end

      private

      def get_keyframe_at(time)
        return @keyframes.first if time <= @keyframes.first.time
        return @keyframes.last if time >= @keyframes.last.time

        @keyframes.each_cons(2) do |kf1, kf2|
          if time >= kf1.time && time <= kf2.time
            t = (time - kf1.time) / (kf2.time - kf1.time)
            return Keyframe.interpolate(kf1, kf2, t)
          end
        end

        nil
      end

      def apply_easing(t, type)
        case type
        when 'ease-in'
          t * t
        when 'ease-out'
          1 - (1 - t) * (1 - t)
        when 'ease-in-out'
          t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
        else
          t
        end
      end
    end
  end
end
