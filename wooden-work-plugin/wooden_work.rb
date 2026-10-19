# Wooden Work SketchUp Plugin
# Author: Archinsights

require 'sketchup'
require 'extensions'

module WoodenWork
  PLUGIN_ID = 'wooden_work'.freeze
  PLUGIN_NAME = 'Archinsights Wooden Work Studio'.freeze
  PLUGIN_VERSION = '1.0.0'.freeze

  plugin_dir = File.dirname(__FILE__)

  ext = SketchupExtension.new(PLUGIN_NAME, File.join(plugin_dir, 'main.rb'))
  ext.description = 'Professional wooden furniture design toolkit.'
  ext.version = PLUGIN_VERSION
  ext.copyright = '2026, Archinsights'
  ext.creator = 'Archinsights'

  Sketchup.register_extension(ext, true)
end
