# Wooden Work - Snap to Grid Utility
# Handles grid snapping for precise placement

module WoodenWork
  module Utils
    class SnapToGrid
      attr_accessor :grid_size, :enabled

      def initialize(grid_size = 10)
        @grid_size = grid_size
        @enabled = true
      end

      def snap_point(point)
        return point unless @enabled

        x = snap_value(point.x)
        y = snap_value(point.y)
        z = snap_value(point.z)

        Geom::Point3d.new(x, y, z)
      end

      def snap_value(val)
        (val / (@grid_size / 1000.0)).round * (@grid_size / 1000.0)
      end

      def toggle
        @enabled = !@enabled
        @enabled
      end

      def set_grid_size(size)
        @grid_size = size
      end

      def self.instance
        @instance ||= new
      end
    end
  end
end
