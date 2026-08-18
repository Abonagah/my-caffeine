import Types "../types/common";

mixin (settings : Types.SettingsState) {
  public query func getSettings() : async Types.CompanySettings {
    settings.value;
  };

  public func updateSettings(
    companyName : Text,
    address : Text,
    phone : Text,
    taxRate : Float,
    lowStockThreshold : Float,
  ) : async () {
    settings.value := {
      companyName;
      address;
      phone;
      taxRate;
      lowStockThreshold;
    };
  };
};
