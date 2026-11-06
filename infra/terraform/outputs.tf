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

output "app_url" {
  value       = "https://${var.domain != "" ? var.domain : azurerm_public_ip.pip.fqdn}"
  description = "URL com certificado SSL automático (HTTPS) para acessar a aplicação"
}

output "domain_fqdn" {
  value       = azurerm_public_ip.pip.fqdn
  description = "Nome de domínio público FQDN gerado nativamente pelo Azure"
}

output "grafana_url" {
  value       = "https://${var.domain != "" ? var.domain : azurerm_public_ip.pip.fqdn}/grafana"
  description = "URL para acessar o painel do Grafana"
}

