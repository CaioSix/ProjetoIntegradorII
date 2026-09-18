output "public_ip" {
  value       = azurerm_linux_virtual_machine.vm.public_ip_address
  description = "Endereço IP público atribuído à Máquina Virtual"
}

output "ssh_command" {
  value       = "ssh ${var.admin_username}@${azurerm_linux_virtual_machine.vm.public_ip_address}"
  description = "Comando pronto para conectar na VM via SSH"
}

output "resource_group_name" {
  value       = azurerm_resource_group.rg.name
  description = "Nome do Grupo de Recursos criado no Azure"
}
