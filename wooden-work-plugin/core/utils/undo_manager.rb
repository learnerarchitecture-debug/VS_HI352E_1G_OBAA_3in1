# Wooden Work - Undo Manager
# Custom undo stack for plugin operations

module WoodenWork
  module Utils
    class UndoManager
      def initialize
        @stack = []
        @max_size = 50
      end

      def push(operation_name)
        model = Sketchup.active_model
        model.start_operation(operation_name, true)
        @stack.push(operation_name)
        trim_stack
      end

      def pop
        model = Sketchup.active_model
        model.abort_operation if @stack.any?
        @stack.pop
      end

      def can_undo?
        @stack.any?
      end

      def clear
        @stack.clear
      end

      private

      def trim_stack
        @stack.shift while @stack.size > @max_size
      end

      def self.instance
        @instance ||= new
      end
    end
  end
end
