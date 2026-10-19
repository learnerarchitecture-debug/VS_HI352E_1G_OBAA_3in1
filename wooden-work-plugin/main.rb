# Wooden Work Plugin - Main Loader
# Loads all modules when SketchUp starts

require 'sketchup'
require 'extensions'

module WoodenWork
  PLUGIN_ID = 'wooden_work'.freeze
  PLUGIN_NAME = 'Archinsights Wooden Work Studio'.freeze
  PLUGIN_VERSION = '1.0.0'.freeze
end

require File.join(File.dirname(__FILE__), 'core', 'utils', 'geometry_helper')
require File.join(File.dirname(__FILE__), 'core', 'components', 'wardrobe')
require File.join(File.dirname(__FILE__), 'core', 'components', 'drawer')
require File.join(File.dirname(__FILE__), 'core', 'components', 'shelf')
require File.join(File.dirname(__FILE__), 'core', 'components', 'door')
require File.join(File.dirname(__FILE__), 'core', 'components', 'frame')
require File.join(File.dirname(__FILE__), 'core', 'materials', 'wood_textures')
require File.join(File.dirname(__FILE__), 'core', 'materials', 'material_manager')
require File.join(File.dirname(__FILE__), 'core', 'materials', 'material_exporter')
require File.join(File.dirname(__FILE__), 'core', 'animation', 'slide_animation')
require File.join(File.dirname(__FILE__), 'core', 'animation', 'swing_animation')
require File.join(File.dirname(__FILE__), 'core', 'animation', 'keyframe')
require File.join(File.dirname(__FILE__), 'core', 'utils', 'dimensions')
require File.join(File.dirname(__FILE__), 'core', 'utils', 'snap_to_grid')
require File.join(File.dirname(__FILE__), 'core', 'utils', 'undo_manager')
require File.join(File.dirname(__FILE__), 'core', 'templates', 'template_library')
require File.join(File.dirname(__FILE__), 'ui', 'toolbar')
require File.join(File.dirname(__FILE__), 'ui', 'main_dialog')
require File.join(File.dirname(__FILE__), 'ui', 'dialogs', 'wardrobe_dialog')
require File.join(File.dirname(__FILE__), 'ui', 'dialogs', 'drawer_dialog')
require File.join(File.dirname(__FILE__), 'ui', 'dialogs', 'material_dialog')
require File.join(File.dirname(__FILE__), 'ui', 'dialogs', 'animation_dialog')
