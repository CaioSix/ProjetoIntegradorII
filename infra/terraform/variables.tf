variable "location" {
  type        = string
  description = "Região da Azure onde os recursos serão provisionados (canadacentral é permitida pela política e possui ampla capacidade para estudantes)"
  default     = "canadacentral"
}

variable "project_name" {
  type        = string
  description = "Prefixo dos recursos para identificação"
  default     = "PI2ControleEscolar"
}

variable "vm_size" {
  type        = string
  description = "Tamanho da máquina virtual"
  default     = "Standard_B2ps_v2"
}

variable "admin_username" {
  type        = string
  description = "Usuário de login SSH da VM Linux"
  default     = "azureuser"
}

variable "ssh_public_key_path" {
  type        = string
  description = "Caminho da chave pública SSH no seu computador"
  default     = "~/.ssh/id_rsa.pub"
}
